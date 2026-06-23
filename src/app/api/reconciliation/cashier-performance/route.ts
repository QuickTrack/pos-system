import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import { Shift, Sale, CashDrop, Variance, User, Branch } from '@/models';
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
    const topLimit = parseInt(searchParams.get('limit') || '10');

    const branchQuery: any = {};
    if (branchParam) {
      branchQuery._id = branchParam;
    } else if (user.role !== 'admin' && user.branch) {
      branchQuery._id = user.branch;
    }

    const branches = await Branch.find(branchQuery).lean();
    const branchIds = branches.map((b: any) => b._id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateFilter =
      startDate && endDate
        ? { $gte: new Date(startDate), $lte: new Date(endDate) }
        : { $gte: today, $lte: tomorrow };

    const salesQuery: any = {
      saleDate: dateFilter,
      status: { $in: ['completed', 'pending', 'refunded'] },
      branch: { $in: branchIds },
    };

    const sales = await Sale.find(salesQuery).lean();

    const cashierMap = new Map<string, {
      userId: string;
      userName: string;
      totalSales: number;
      totalTransactions: number;
      voids: number;
      refunds: number;
      discounts: number;
      variances: number;
      varianceErrors: number;
      completedReconciliations: number;
      cashHandlingErrors: number;
    }>();

    for (const sale of sales) {
      const key = sale.cashier.toString();
      const existing = cashierMap.get(key);

      if (!existing) {
        cashierMap.set(key, {
          userId: sale.cashier.toString(),
          userName: sale.cashierName,
          totalSales: 0,
          totalTransactions: 0,
          voids: 0,
          refunds: 0,
          discounts: 0,
          variances: 0,
          varianceErrors: 0,
          completedReconciliations: 0,
          cashHandlingErrors: 0,
        });
      }

      const entry = cashierMap.get(key)!;

      if (sale.status === 'voided') {
        entry.voids++;
        entry.discounts += sale.discountAmount || 0;
        continue;
      }
      if (sale.isRefund) {
        entry.refunds++;
        continue;
      }

      entry.totalTransactions++;
      entry.totalSales += sale.total;
      entry.discounts += sale.discountAmount || 0;
    }

    const shiftQuery: any = {
      status: 'closed',
      startTime: { $gte: dateFilter.$gte, $lte: dateFilter.$lte },
      branch: { $in: branchIds },
    };

    const shifts = await Shift.find(shiftQuery).populate('cashier', 'name').lean();

    for (const shift of shifts) {
      const key = (shift.cashier as any)._id.toString();
      const existing = cashierMap.get(key);

      if (existing) {
        existing.completedReconciliations++;
        if (shift.variance !== 0) {
          existing.varianceErrors++;
          existing.variances = Math.abs(shift.variance);
          if (shift.variance < 0) {
            existing.cashHandlingErrors += Math.abs(shift.variance);
          }
        }
      }
    }

    const varianceQuery: any = {
      createdAt: { $gte: dateFilter.$gte, $lte: dateFilter.$lte },
      branch: { $in: branchIds },
    };

    const variances = await Variance.find(varianceQuery).populate('approvedBy', 'name').lean();

    for (const variance of variances) {
      const key = (variance as any).approvedBy?._id?.toString();
      if (!key) continue;

      const existing = cashierMap.get(key);
      if (existing) {
        existing.varianceErrors++;
        existing.variances += variance.amount;
        if (variance.type === 'shortage') {
          existing.cashHandlingErrors += variance.amount;
        }
      }
    }

    const performers = Array.from(cashierMap.values())
      .map((c) => ({
        userId: c.userId,
        userName: c.userName,
        totalSales: c.totalSales,
        totalTransactions: c.totalTransactions,
        voids: c.voids,
        refunds: c.refunds,
        discounts: c.discounts,
        variances: c.variances,
        varianceErrors: c.varianceErrors,
        completedReconciliations: c.completedReconciliations,
        cashHandlingErrors: c.cashHandlingErrors,
        averageTransactionValue: c.totalTransactions > 0 ? Math.round(c.totalSales / c.totalTransactions) : 0,
        reconciliationSuccessRate: c.completedReconciliations > 0 ? Math.round((c.completedReconciliations - c.varianceErrors) / c.completedReconciliations * 100) : 100,
      }))
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, topLimit);

    return NextResponse.json({
      success: true,
      cashierPerformance: {
        topPerformers: performers,
        totalCashiers: cashierMap.size,
      },
    });
  } catch (error) {
    console.error('Cashier performance error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to load cashier performance', details: errorMessage }, { status: 500 });
  }
}
