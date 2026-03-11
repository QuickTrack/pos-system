import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Sale from '@/models/Sale';
import Product from '@/models/Product';
import Customer from '@/models/Customer';
import Supplier from '@/models/Supplier';
import Purchase from '@/models/Purchase';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today';
    const branch = searchParams.get('branch');
    
    // Calculate date ranges
    const now = new Date();
    let startDate: Date;
    let previousStartDate: Date;
    let previousEndDate: Date;
    
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        previousStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        previousEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        previousStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14);
        previousEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        previousStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        previousEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
    
    const branchQuery = branch ? { branch } : (user.branch ? { branch: user.branch } : {});
    
    // Current period stats
    const [currentSales, currentRevenue, currentProfit] = await Promise.all([
      Sale.countDocuments({
        ...branchQuery,
        saleDate: { $gte: startDate },
        status: 'completed',
      }),
      Sale.aggregate([
        {
          $match: {
            ...branchQuery,
            saleDate: { $gte: startDate },
            status: 'completed',
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$total' },
          },
        },
      ]),
      Sale.aggregate([
        {
          $match: {
            ...branchQuery,
            saleDate: { $gte: startDate },
            status: 'completed',
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$profit' },
          },
        },
      ]),
    ]);
    
    // Previous period stats
    const [previousSales, previousRevenue] = await Promise.all([
      Sale.countDocuments({
        ...branchQuery,
        saleDate: { $gte: previousStartDate, $lt: previousEndDate },
        status: 'completed',
      }),
      Sale.aggregate([
        {
          $match: {
            ...branchQuery,
            saleDate: { $gte: previousStartDate, $lt: previousEndDate },
            status: 'completed',
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$total' },
          },
        },
      ]),
    ]);
    
    // Best selling products
    const bestSellers = await Sale.aggregate([
      {
        $match: {
          ...branchQuery,
          saleDate: { $gte: startDate },
          status: 'completed',
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.productName' },
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.total' },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: 10 },
    ]);
    
    // Low stock products
    const lowStockProducts = await Product.find({
      ...(branch ? { branch } : {}),
      isActive: true,
      $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] },
    })
      .select('name sku stockQuantity lowStockThreshold')
      .limit(10);
    
    // Recent sales
    const recentSales = await Sale.find({
      ...branchQuery,
      status: 'completed',
    })
      .populate('customer', 'name')
      .populate('cashier', 'name')
      .sort({ saleDate: -1 })
      .limit(10);
    
    // Total counts
    const [totalProducts, totalCustomers, totalSuppliers, totalPurchases] = await Promise.all([
      Product.countDocuments({ isActive: true }),
      Customer.countDocuments({ isActive: true }),
      Supplier.countDocuments({ isActive: true }),
      Purchase.countDocuments({
        ...branchQuery,
        status: { $in: ['pending', 'ordered', 'partial'] },
      }),
    ]);
    
    // Calculate changes
    const revenue = currentRevenue[0]?.total || 0;
    const prevRevenue = previousRevenue[0]?.total || 0;
    const revenueChange = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
    
    const salesChange = previousSales > 0 
      ? ((currentSales - previousSales) / previousSales) * 100 
      : 0;
    
    // Daily sales for chart (last 30 days)
    const dailySales = await Sale.aggregate([
      {
        $match: {
          ...branchQuery,
          saleDate: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
          status: 'completed',
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } },
          sales: { $sum: 1 },
          revenue: { $sum: '$total' },
          profit: { $sum: '$profit' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    
    return NextResponse.json({
      success: true,
      stats: {
        sales: {
          current: currentSales,
          previous: previousSales,
          change: salesChange,
        },
        revenue: {
          current: revenue,
          previous: prevRevenue,
          change: revenueChange,
        },
        profit: currentProfit[0]?.total || 0,
        totalProducts,
        totalCustomers,
        totalSuppliers,
        pendingPurchases: totalPurchases,
      },
      bestSellers,
      lowStockProducts,
      recentSales,
      dailySales,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
