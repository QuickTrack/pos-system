import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import { Shift, Sale, CashDrop, Expense, Variance, User, Branch } from '@/models';
import { getAuthUser } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const branchParam = searchParams.get('branch');

    const branchQuery: any = {};
    if (branchParam) {
      branchQuery._id = branchParam;
    } else if (user.role !== 'admin' && user.branch) {
      branchQuery._id = user.branch;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateFilter =
      startDate && endDate
        ? { $gte: new Date(startDate), $lte: new Date(endDate) }
        : { $gte: today, $lte: tomorrow };

    const branches = await Branch.find(branchQuery).lean();

    const now = new Date();
    const openShifts = await Shift.find({ status: 'open', ...(user.branch && !branchParam ? { branch: user.branch } : {}) })
      .populate('cashier', 'name')
      .populate('register', 'name registerNumber')
      .lean();

    const salesQuery: any = {
      saleDate: dateFilter,
      status: { $in: ['completed', 'pending', 'refunded'] },
    };
    if (branchParam) salesQuery.branch = branchParam;
    if (user.role !== 'admin' && user.branch) salesQuery.branch = user.branch;

    const sales = await Sale.find(salesQuery).lean();

    let grossSales = 0;
    let netSales = 0;
    let totalTransactions = 0;
    let discounts = 0;
    let refunds = 0;
    let cashSales = 0;
    let mpesaSales = 0;
    let cardSales = 0;
    let bankSales = 0;
    let creditSales = 0;
    let mixedSales = 0;

    for (const sale of sales) {
      if (sale.status === 'voided') continue;
      if (sale.isRefund) {
        refunds++;
        netSales -= sale.total;
        grossSales -= sale.total;
        continue;
      }

      totalTransactions++;

      if (sale.paymentMethod === 'cash') {
        cashSales += sale.total;
      } else if (sale.paymentMethod === 'mpesa') {
        mpesaSales += sale.total;
      } else if (sale.paymentMethod === 'card') {
        cardSales += sale.total;
      } else if (sale.paymentMethod === 'mixed') {
        mixedSales += sale.total;
        cashSales += sale.paymentDetails?.filter((p: any) => p.method === 'cash').reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
        mpesaSales += sale.paymentDetails?.filter((p: any) => p.method === 'mpesa').reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
        cardSales += sale.paymentDetails?.filter((p: any) => p.method === 'card').reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
        bankSales += sale.paymentDetails?.filter((p: any) => p.method === 'bank_transfer').reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
      } else if (sale.paymentMethod === 'account' || sale.paymentMethod === 'credit') {
        creditSales += sale.total;
      } else if (sale.paymentMethod === 'bank_transfer') {
        bankSales += sale.total;
      }

      discounts += sale.discountAmount || 0;
      netSales += sale.total;
      grossSales += sale.total;
    }

    const cashDropQuery: any = { branch: branchParam || user.branch, dropTime: dateFilter };
    const cashDrops = await CashDrop.find(cashDropQuery).lean();
    const cashDropsTotal = cashDrops.reduce((sum: number, d: any) => sum + d.amount, 0);

    const expenseQuery: any = {
      branch: branchParam || user.branch,
      dateTime: dateFilter,
    };
    const expenses = await Expense.find(expenseQuery).lean();
    const expensesTotal = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);

    const closingShiftQuery: any = {
      status: 'closed',
      endTime: dateFilter,
    };
    if (branchParam) closingShiftQuery.branch = branchParam;
    if (user.role !== 'admin' && user.branch) closingShiftQuery.branch = user.branch;

    const closingShifts = await Shift.find(closingShiftQuery).lean();
    const totalExpected = closingShifts.reduce((sum: number, s) => sum + (s.expectedCash || 0), 0);
    const totalActual = closingShifts.reduce((sum: number, s) => sum + (s.actualCash || 0), 0);
    const totalVariance = closingShifts.reduce((sum: number, s) => sum + (s.variance || 0), 0);

    const varianceQuery: any = { createdAt: dateFilter };
    if (branchParam) varianceQuery.branch = branchParam;
    else if (user.role !== 'admin' && user.branch) varianceQuery.branch = user.branch;

    const variances = await Variance.find(varianceQuery).lean();
    const shortages = variances.filter((v: any) => v.type === 'shortage').reduce((sum: number, v: any) => sum + v.amount, 0);
    const overages = variances.filter((v: any) => v.type === 'overage').reduce((sum: number, v: any) => sum + v.amount, 0);

    const openingFloatTotal = closingShifts.reduce((sum: number, s) => sum + (s.openingFloat || 0), 0);

    return NextResponse.json({
      success: true,
      dashboard: {
        sales: {
          grossSales,
          netSales,
          totalTransactions,
          averageSaleValue: totalTransactions > 0 ? Math.round(netSales / totalTransactions) : 0,
          discounts,
          refunds,
        },
        payments: {
          cash: cashSales,
          mpesa: mpesaSales,
          card: cardSales,
          bank: bankSales,
          credit: creditSales,
          mixed: mixedSales,
        },
        cash: {
          openingFloat: openingFloatTotal,
          cashSales,
          cashDrops: cashDropsTotal,
          expenses: expensesTotal,
          expectedCash: totalExpected,
          actualCash: totalActual,
          variance: totalVariance,
        },
        shifts: {
          open: openShifts.length,
          closed: closingShifts.length,
          openShifts,
        },
        variances: {
          total: variances.length,
          shortages,
          overages,
        },
        branches,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to load dashboard', details: errorMessage }, { status: 500 });
  }
}
