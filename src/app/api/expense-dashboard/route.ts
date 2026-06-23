import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Expense from '@/models/Expense';
import ExpenseCategory from '@/models/ExpenseCategory';
import { getAuthUser } from '@/lib/auth-server';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999);
    } else {
      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
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
    }

    const branchFilter = user.role !== 'admin' && user.branch ? { branch: user.branch } : {};

    const baseMatch = {
      ...branchFilter,
      dateTime: { $gte: startDate, $lte: endDate },
    };

    const [todayMatch, weekMatch, monthMatch, pendingCount, approvedCount, rejectedCount, categoriesBreakdown, branchesBreakdown, paymentMethodsBreakdown, monthlyTrends, departmentBreakdown] = await Promise.all([
      Expense.aggregate([
        {
          $match: {
            ...branchFilter,
            dateTime: {
              $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
              $lte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999),
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
      Expense.aggregate([
        {
          $match: {
            ...branchFilter,
            dateTime: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
      Expense.aggregate([
        {
          $match: {
            ...branchFilter,
            dateTime: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
      Expense.countDocuments({ ...baseMatch, status: 'pending' }),
      Expense.countDocuments({ ...baseMatch, status: 'approved' }),
      Expense.countDocuments({ ...baseMatch, status: 'rejected' }),
      Expense.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: '$expenseCategory',
            name: { $first: '$expenseCategoryName' },
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 10 },
      ]),
      Expense.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: '$branch',
            name: { $first: '$branchName' },
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 10 },
      ]),
      Expense.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: '$paymentSource',
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
      Expense.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$dateTime' } },
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 12 },
      ]),
      Expense.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: '$department',
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 10 },
      ]),
    ]);

    const todayTotal = todayMatch[0]?.total || 0;
    const weekTotal = weekMatch[0]?.total || 0;
    const monthTotal = monthMatch[0]?.total || 0;

    const categoriesSerialized = await Promise.all(
      categoriesBreakdown.map(async (c: any) => {
        const cat = await ExpenseCategory.findById(c._id).select('name').lean();
        return {
          _id: c._id.toString(),
          name: c.name || cat?.name || 'Unknown',
          total: c.total || 0,
          count: c.count || 0,
        };
      })
    );

    const branchesSerialized = branchesBreakdown.map((b: any) => ({
      _id: b._id ? b._id.toString() : 'unknown',
      name: b.name || 'Unknown',
      total: b.total || 0,
      count: b.count || 0,
    }));

    const paymentMethodsSerialized = paymentMethodsBreakdown.map((p: any) => ({
      name: p._id || 'Unknown',
      total: p.total || 0,
      count: p.count || 0,
    }));

    const monthlyTrendsSerialized = monthlyTrends.map((m: any) => ({
      month: m._id || 'Unknown',
      total: m.total || 0,
      count: m.count || 0,
    }));

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          todayTotal,
          weekTotal,
          monthTotal,
          pendingCount,
          approvedCount,
          rejectedCount,
          totalExpenses: monthTotal,
        },
        categoriesBreakdown: categoriesSerialized,
        branchesBreakdown: branchesSerialized,
        paymentMethodsBreakdown: paymentMethodsSerialized,
        monthlyTrends: monthlyTrendsSerialized,
        departmentBreakdown: departmentBreakdown
          .filter((d: any) => d._id && d._id.trim() !== '')
          .map((d: any) => ({
            department: d._id || 'Unassigned',
            total: d.total || 0,
            count: d.count || 0,
          })),
      },
    });
  } catch (error) {
    console.error('Error fetching expense dashboard data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch expense dashboard data' },
      { status: 500 }
    );
  }
}
