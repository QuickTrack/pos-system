import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import { Shift, Sale, CashDrop, Expense, User, Branch, ActivityLog } from '@/models';
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
    const shiftId = searchParams.get('shiftId');

    if (!shiftId) {
      return NextResponse.json({ error: 'Shift ID is required' }, { status: 400 });
    }

    const shift = await Shift.findById(shiftId);
    if (!shift || shift.status !== 'open') {
      return NextResponse.json({ error: 'Invalid or closed shift' }, { status: 400 });
    }

    const shiftStart = new Date(shift.startTime);
    const now = new Date();

    const salesQuery: any = {
      saleDate: { $gte: shiftStart, $lte: now },
      status: { $in: ['completed', 'pending', 'refunded'] },
      branch: shift.branch,
    };

    const sales = await Sale.find(salesQuery).lean();

    let cashSales = 0;
    let mpesaSales = 0;
    let cardSales = 0;
    let bankSales = 0;
    let creditSales = 0;
    let mixedSales = 0;
    let discounts = 0;
    let returns = 0;
    let totalTransactions = 0;
    let refunds = 0;
    let voids = 0;
    let taxableSalesAmount = 0;
    let vatAmount = 0;

    for (const sale of sales) {
      if (sale.isRefund) {
        refunds++;
        returns += sale.total;
        continue;
      }
      if (sale.status === 'voided') {
        voids++;
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
        const cashPart = sale.paymentDetails?.filter((p: any) => p.method === 'cash').reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
        const mpesaPart = sale.paymentDetails?.filter((p: any) => p.method === 'mpesa').reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
        const cardPart = sale.paymentDetails?.filter((p: any) => p.method === 'card').reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
        const bankPart = sale.paymentDetails?.filter((p: any) => p.method === 'bank_transfer').reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
        cashSales += cashPart;
        mpesaSales += mpesaPart;
        cardSales += cardPart;
        bankSales += bankPart;
      } else if (sale.paymentMethod === 'account' || sale.paymentMethod === 'credit') {
        creditSales += sale.total;
      } else if (sale.paymentMethod === 'bank_transfer') {
        bankSales += sale.total;
      }

      discounts += sale.discountAmount || 0;

      if (sale.taxRate && !sale.isRefund) {
        vatAmount += sale.tax || 0;
        const baseAmount = sale.total / (1 + (sale.taxRate || 16) / 100);
        taxableSalesAmount += baseAmount;
      }
    }

    const cashReceived = cashSales;
    const cashDropsTotal = await CashDrop.aggregate([
      { $match: { shift: (shift as any)._id } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).then(r => r[0]?.total || 0);

    const expensesTotal = await Expense.aggregate([
      {
        $match: {
          branch: shift.branch,
          dateTime: { $gte: shiftStart, $lte: now },
          status: { $in: ['approved', 'pending'] },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).then(r => r[0]?.total || 0);

    const expectedCash = shift.openingFloat + cashReceived - cashDropsTotal - expensesTotal;
    const actualCash = shift.actualCash || 0;
    const variance = actualCash - expectedCash;

    const grossSales = cashSales + mpesaSales + cardSales + bankSales + creditSales + mixedSales + returns;
    const netSales = grossSales - discounts;

    return NextResponse.json({
      success: true,
      xRead: {
        shiftId: shift.shiftId,
        cashierName: shift.cashierName,
        registerNumber: shift.registerNumber,
        date: now,
        snapshotTime: now.toISOString(),
        salesBreakdown: {
          grossSales,
          discounts,
          returns,
          netSales,
          totalTransactions,
          refunds,
          voids,
        },
        paymentBreakdown: {
          cash: cashSales,
          mpesa: mpesaSales,
          card: cardSales,
          bank: bankSales,
          credit: creditSales,
          mixed: mixedSales,
        },
        taxSummary: {
          vatCollected: vatAmount,
          taxableSales: taxableSalesAmount,
          zeroRatedSales: netSales - taxableSalesAmount,
          taxRate: 16,
        },
        cashSummary: {
          openingFloat: shift.openingFloat,
          cashReceived,
          cashDrops: cashDropsTotal,
          expenses: expensesTotal,
          expectedCash,
          actualCash,
          variance,
        },
      },
    });
  } catch (error) {
    console.error('Get x-read error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to generate x-read', details: errorMessage }, { status: 500 });
  }
}
