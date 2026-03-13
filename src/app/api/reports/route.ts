import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Sale from '@/models/Sale';
import Product from '@/models/Product';
import { getAuthUser } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'sales';
    const period = searchParams.get('period') || 'month';
    
    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    const branchQuery = user.branch ? { branch: user.branch } : {};
    
    // Common match query
    const matchQuery = {
      ...branchQuery,
      saleDate: { $gte: startDate },
      status: 'completed',
    };
    
    if (type === 'sales' || type === 'profit') {
      // Get sales summary
      const [salesSummary, salesByDay, salesByPayment, topProducts] = await Promise.all([
        Sale.aggregate([
          { $match: matchQuery },
          {
            $group: {
              _id: null,
              totalSales: { $sum: 1 },
              totalRevenue: { $sum: '$total' },
              totalProfit: { $sum: '$profit' },
              totalTax: { $sum: '$tax' },
            },
          },
        ]),
        Sale.aggregate([
          { $match: matchQuery },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } },
              sales: { $sum: 1 },
              revenue: { $sum: '$total' },
              profit: { $sum: '$profit' },
            },
          },
          { $sort: { _id: 1 } },
          { $limit: 30 },
        ]),
        Sale.aggregate([
          { $match: matchQuery },
          {
            $group: {
              _id: '$paymentMethod',
              value: { $sum: '$total' },
            },
          },
        ]),
        Sale.aggregate([
          { $match: matchQuery },
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.product',
              name: { $first: '$items.productName' },
              quantity: { $sum: '$items.quantity' },
              revenue: { $sum: '$items.total' },
            },
          },
          { $sort: { revenue: -1 } },
          { $limit: 20 },
        ]),
      ]);
      
      const summary = salesSummary[0] || {
        totalSales: 0,
        totalRevenue: 0,
        totalProfit: 0,
        totalTax: 0,
      };
      
      return NextResponse.json({
        success: true,
        data: {
          ...summary,
          salesByDay,
          salesByPayment: salesByPayment.map((s: any) => ({
            name: s._id || 'Unknown',
            value: s.value,
          })),
          topProducts,
        },
      });
    }
    
    if (type === 'products') {
      const products = await Product.find({ isActive: true })
        .populate('category', 'name')
        .sort({ stockQuantity: -1 });
      
      return NextResponse.json({
        success: true,
        data: { products },
      });
    }
    
    return NextResponse.json({
      success: true,
      data: {},
    });
  } catch (error) {
    console.error('Reports error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
