import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Sale from '@/models/Sale';
import Product from '@/models/Product';
import Customer from '@/models/Customer';
import Purchase from '@/models/Purchase';
import { getAuthUser } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today': {
        const today = new Date(now);
        startDate = new Date(today.setHours(0, 0, 0, 0));
        break;
      }
      case 'week': {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        startDate = weekAgo;
        break;
      }
      case 'month': {
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        startDate = monthAgo;
        break;
      }
      case 'year': {
        const yearAgo = new Date(now);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        startDate = yearAgo;
        break;
      }
      default: {
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        startDate = monthAgo;
      }
    }

    const branchFilter = user.role !== 'admin' && user.branch ? { branch: user.branch } : {};
    
    const [
      salesData,
      revenueData,
      topProducts,
      topCustomers,
      categoryBreakdown,
      paymentBreakdown,
      dailySales,
      purchasesData,
    ] = await Promise.all([
      Sale.aggregate([
        { $match: { saleDate: { $gte: startDate }, status: 'completed', ...branchFilter } },
        {
          $group: {
            _id: null,
            totalSales: { $sum: 1 },
            totalRevenue: { $sum: '$total' },
            totalProfit: { $sum: '$profit' },
            avgOrderValue: { $avg: '$total' },
          },
        },
      ]),
      Sale.aggregate([
        { $match: { saleDate: { $gte: startDate }, status: 'completed', ...branchFilter } },
        {
          $group: {
            _id: { year: { $year: '$saleDate' }, month: { $month: '$saleDate' } },
            revenue: { $sum: '$total' },
            profit: { $sum: '$profit' },
          },
        },
        {
          $addFields: {
            monthLabel: {
              $dateToString: {
                format: '%Y-%m',
                date: {
                  $dateFromParts: {
                    year: '$_id.year',
                    month: '$_id.month',
                    day: 1,
                  },
                },
              },
            },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      Sale.aggregate([
        { $match: { saleDate: { $gte: startDate }, status: 'completed', ...branchFilter } },
        { $unwind: '$items' },
        { $match: { 'items.product': { $exists: true, $ne: null } } },
        {
          $group: {
            _id: '$items.product',
            productName: { $first: '$items.productName' },
            totalQuantity: { $sum: '$items.quantity' },
            totalRevenue: { $sum: '$items.total' },
          },
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 },
      ]),
      Sale.aggregate([
        { $match: { saleDate: { $gte: startDate }, status: 'completed', customer: { $ne: null }, ...branchFilter } },
        {
          $group: {
            _id: '$customer',
            customerName: { $first: '$customerName' },
            totalSpent: { $sum: '$total' },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { totalSpent: -1 } },
        { $limit: 10 },
      ]),
      Sale.aggregate([
        { $match: { saleDate: { $gte: startDate }, status: 'completed', ...branchFilter } },
        { $unwind: '$items' },
        { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'productInfo' } },
        { $unwind: '$productInfo' },
        {
          $group: {
            _id: '$productInfo.category',
            totalRevenue: { $sum: '$items.total' },
            totalQuantity: { $sum: '$items.quantity' },
          },
        },
        { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
        { $unwind: '$category' },
        { $sort: { totalRevenue: -1 } },
      ]),
      Sale.aggregate([
        { $match: { saleDate: { $gte: startDate }, status: 'completed', ...branchFilter } },
        {
          $group: {
            _id: '$paymentMethod',
            count: { $sum: 1 },
            total: { $sum: '$amountPaid' },
          },
        },
      ]),
      Sale.aggregate([
        { $match: { saleDate: { $gte: new Date(new Date().setDate(new Date().getDate() - 30)) }, status: 'completed', ...branchFilter } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } },
            sales: { $sum: 1 },
            revenue: { $sum: '$total' },
            profit: { $sum: '$profit' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Purchase.aggregate([
        { $match: { orderDate: { $gte: startDate }, ...branchFilter } },
        {
          $group: {
            _id: null,
            totalPurchases: { $sum: 1 },
            totalSpent: { $sum: '$total' },
          },
        },
      ]),
    ]);
    
    const [totalProducts, totalCustomers] = await Promise.all([
      Product.countDocuments({ isActive: true }),
      Customer.countDocuments({ isActive: true }),
    ]);
    
    return NextResponse.json({
      success: true,
      summary: salesData[0] || { totalSales: 0, totalRevenue: 0, totalProfit: 0, avgOrderValue: 0 },
      revenueData,
      topProducts,
      topCustomers,
      categoryBreakdown,
      paymentBreakdown,
      dailySales,
      purchases: purchasesData[0] || { totalPurchases: 0, totalSpent: 0 },
      totals: {
        products: totalProducts,
        customers: totalCustomers,
      },
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
