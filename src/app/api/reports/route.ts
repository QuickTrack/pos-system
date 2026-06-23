import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Sale from '@/models/Sale';
import Purchase from '@/models/Purchase';
import Customer from '@/models/Customer';
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
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 1000);
    
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
    
    const branchFilter = user.role !== 'admin' && user.branch ? { branch: user.branch } : {};
    
    const matchQuery = {
      ...branchFilter,
      saleDate: { $gte: startDate },
      status: 'completed',
    };
    
    if (type === 'sales') {
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
          { $match: { 'items.product': { $exists: true, $ne: null } } },
          {
            $group: {
              _id: '$items.product',
              name: { $first: '$items.productName' },
              quantity: { $sum: '$items.quantity' },
              revenue: { $sum: '$items.total' },
              profit: { $sum: { $multiply: ['$items.quantity', { $subtract: ['$items.unitPrice', { $ifNull: ['$items.costPrice', 0] }] }] } },
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
      
      const serializedTopProducts = topProducts.map((p: any) => ({
        ...p,
        _id: p._id?.toString(),
      }));
      
      return NextResponse.json({
        success: true,
        data: {
          ...summary,
          salesByDay,
          salesByPayment: salesByPayment.map((s: any) => ({
            name: s._id || 'Unknown',
            value: s.value,
          })),
          topProducts: serializedTopProducts,
        },
      });
    }
    
    if (type === 'products') {
      const topProducts = await Sale.aggregate([
        { $match: matchQuery },
        { $unwind: '$items' },
        { $match: { 'items.product': { $exists: true, $ne: null } } },
        {
          $group: {
            _id: '$items.product',
            name: { $first: '$items.productName' },
            sku: { $first: '$items.sku' },
            quantity: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.total' },
            profit: { $sum: { $multiply: ['$items.quantity', { $subtract: ['$items.unitPrice', { $ifNull: ['$items.costPrice', 0] }] }] } },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 20 },
      ]);

      const serializedTopProducts = topProducts.map((p: any) => ({
        ...p,
        _id: p._id?.toString(),
      }));

      return NextResponse.json({
        success: true,
        data: { topProducts: serializedTopProducts },
      });
    }

    if (type === 'customers') {
      const topCustomers = await Sale.aggregate([
        { $match: matchQuery },
        { $match: { customer: { $ne: null } } },
        {
          $group: {
            _id: '$customer',
            customerName: { $first: '$customerName' },
            customerPhone: { $first: '$customerPhone' },
            customerEmail: { $first: '$customerEmail' },
            purchases: { $sum: 1 },
            revenue: { $sum: '$total' },
            lastPurchaseDate: { $max: '$saleDate' },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: 'customers',
            localField: '_id',
            foreignField: '_id',
            as: 'customerInfo',
          },
        },
        { $unwind: { path: '$customerInfo', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: { $toString: '$_id' },
            name: { $ifNull: ['$customerInfo.name', '$customerName'] },
            phone: { $ifNull: ['$customerInfo.phone', '$customerPhone'] },
            email: { $ifNull: ['$customerInfo.email', '$customerEmail'] },
            balanceDue: { $ifNull: ['$customerInfo.balanceDue', 0] },
            purchases: 1,
            revenue: 1,
            lastPurchaseDate: 1,
          },
        },
      ]);

      const totalCustomers = await Customer.countDocuments({ isActive: true, ...branchFilter });

      return NextResponse.json({
        success: true,
        data: {
          totalCustomers,
          topCustomers,
        },
      });
    }

    if (type === 'inventory') {
      const inventoryReport = await Product.aggregate([
        { $match: { isActive: true, ...branchFilter } },
        {
          $addFields: {
            stock: {
              $cond: [
                {
                  $or: [
                    { $ne: [{ $type: '$shopStock' }, 'missing'] },
                    { $ne: [{ $type: '$remoteStock' }, 'missing'] },
                  ],
                },
                { $add: [{ $ifNull: ['$shopStock', 0] }, { $ifNull: ['$remoteStock', 0] }] },
                { $ifNull: ['$stockQuantity', 0] },
              ],
            },
            lowStockThresholdValue: { $ifNull: ['$lowStockThreshold', 10] },
          },
        },
        {
          $addFields: {
            value: { $multiply: ['$stock', { $ifNull: ['$retailPrice', 0] }] },
            statusRank: {
              $cond: [
                { $eq: ['$stock', 0] },
                3,
                { $cond: [{ $lte: ['$stock', '$lowStockThresholdValue'] }, 2, 1] },
              ],
            },
          },
        },
        {
          $facet: {
            inventoryItems: [
              {
                $lookup: {
                  from: 'categories',
                  localField: 'category',
                  foreignField: '_id',
                  as: 'categoryInfo',
                },
              },
              { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
              {
                $project: {
                  _id: 1,
                  name: 1,
                  sku: 1,
                  category: { $ifNull: ['$categoryInfo.name', 'Uncategorized'] },
                  stock: 1,
                  value: 1,
                  status: {
                    $cond: [
                      { $eq: ['$stock', 0] },
                      'Out of Stock',
                      {
                        $cond: [
                          { $lte: ['$stock', '$lowStockThresholdValue'] },
                          'Low Stock',
                          'In Stock',
                        ],
                      },
                    ],
                  },
                  retailPrice: 1,
                  costPrice: 1,
                  lowStockThreshold: '$lowStockThresholdValue',
                },
              },
              { $sort: { statusRank: 1, name: 1 } },
              { $limit: limit },
            ],
            summary: [
              {
                $group: {
                  _id: null,
                  totalProducts: { $sum: 1 },
                  lowStockItems: {
                    $sum: { $cond: [{ $lte: ['$stock', '$lowStockThresholdValue'] }, 1, 0] },
                  },
                  outOfStock: { $sum: { $cond: [{ $eq: ['$stock', 0] }, 1, 0] } },
                  totalValue: { $sum: '$value' },
                },
              },
            ],
          },
        },
      ]);

      const report = inventoryReport[0];
      const summary = report?.summary?.[0] || {
        totalProducts: 0,
        lowStockItems: 0,
        outOfStock: 0,
        totalValue: 0,
      };

      return NextResponse.json({
        success: true,
        data: {
          ...summary,
          inventoryItems: report?.inventoryItems || [],
        },
      });
    }

    if (type === 'profit') {
      const [profitSummary, profitByDay, purchasesByDay] = await Promise.all([
        Sale.aggregate([
          { $match: matchQuery },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$total' },
              totalProfit: { $sum: '$profit' },
            },
          },
        ]),
        Sale.aggregate([
          { $match: matchQuery },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } },
              revenue: { $sum: '$total' },
              profit: { $sum: '$profit' },
            },
          },
          { $sort: { _id: 1 } },
          { $limit: 30 },
        ]),
        Purchase.aggregate([
          {
            $match: {
              ...branchFilter,
              orderDate: { $gte: startDate },
              status: { $in: ['received', 'ordered', 'partial'] },
            },
          },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$orderDate' } },
              cost: { $sum: '$total' },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]);

      const summary = profitSummary[0] || {
        totalRevenue: 0,
        totalProfit: 0,
      };

      const totalCost = await Purchase.aggregate([
        {
          $match: {
            ...branchFilter,
            orderDate: { $gte: startDate },
            status: { $in: ['received', 'ordered', 'partial'] },
          },
        },
        {
          $group: {
            _id: null,
            totalCost: { $sum: '$total' },
          },
        },
      ]);

      const cost = totalCost[0]?.totalCost || 0;
      const grossProfit = summary.totalRevenue - cost;
      const netProfit = summary.totalProfit;

      // Merge profit and cost data by day
      const profitByDayMap = new Map(profitByDay.map((p: any) => [p._id, p]));
      const purchasesByDayMap = new Map(purchasesByDay.map((p: any) => [p._id, p.cost]));
      
      const allDates = new Set([
        ...profitByDay.map((p: any) => p._id),
        ...purchasesByDay.map((p: any) => p._id),
      ]);

      const mergedProfitByDay = Array.from(allDates).sort().map((date) => ({
        date,
        revenue: profitByDayMap.get(date)?.revenue || 0,
        cost: purchasesByDayMap.get(date) || 0,
        profit: profitByDayMap.get(date)?.profit || 0,
      }));

      return NextResponse.json({
        success: true,
        data: {
          totalRevenue: summary.totalRevenue,
          totalCost: cost,
          grossProfit,
          netProfit,
          profitByDay: mergedProfitByDay,
        },
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
