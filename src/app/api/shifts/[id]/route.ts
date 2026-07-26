import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';

import dbConnect from '@/lib/db/mongodb';
import { Shift, Sale, CashDrop, Expense } from '@/models';
import { getAuthUser } from '@/lib/auth-server';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;

    const shift = await Shift.findById(id).lean();
    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    const shiftBranchId = (shift as any).branch?._id 
      ? (shift as any).branch._id.toString() 
      : (shift as any).branch?.toString();

    const shiftStart = new Date(shift.startTime);
    const shiftEnd = (shift as any).endTime ? new Date((shift as any).endTime) : new Date();

    const salesQuery: any = {
      saleDate: { $gte: shiftStart, $lte: shiftEnd },
      status: { $in: ['completed', 'pending', 'refunded'] },
    };

    if (shiftBranchId) {
      salesQuery.branch = new mongoose.Types.ObjectId(shiftBranchId);
    }

    const sales = await Sale.find(salesQuery).lean();

    // Calculate sales totals from actual sales data
    let cashSales = 0;
    let mpesaSales = 0;
    let cardSales = 0;

    for (const sale of sales) {
      if (sale.isRefund) continue;
      if (sale.status === 'voided') continue;

      if (sale.paymentMethod === 'cash') {
        cashSales += sale.total;
      } else if (sale.paymentMethod === 'mpesa') {
        mpesaSales += sale.total;
      } else if (sale.paymentMethod === 'card') {
        cardSales += sale.total;
      } else if (sale.paymentMethod === 'mixed') {
        cashSales += sale.paymentDetails?.filter((p: any) => p.method === 'cash').reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
        mpesaSales += sale.paymentDetails?.filter((p: any) => p.method === 'mpesa').reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
        cardSales += sale.paymentDetails?.filter((p: any) => p.method === 'card').reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
      }
    }

    const cashDropsTotal = await CashDrop.aggregate([
      { $match: { shift: (shift as any)._id, reason: { $in: ['safe_deposit', 'bank_deposit', 'security', 'float_transfer'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).then(r => r[0]?.total || 0);

    const expensesQuery: any = {
      paymentSource: { $in: ['cash_drawer', 'main_till', 'petty_cash'] },
      status: { $in: ['approved', 'pending'] },
      $or: [
        { shift: (shift as any)._id },
        { $and: [{ shift: null }, { dateTime: { $gte: shiftStart, $lte: shiftEnd } }] },
      ],
    };

    if (shiftBranchId) {
      expensesQuery.branch = new mongoose.Types.ObjectId(shiftBranchId);
    }

    const expensesTotal = await Expense.aggregate([
      { $match: expensesQuery },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).then(r => r[0]?.total || 0);

    // Use stored values if available, otherwise calculate
    const cashReceived = (shift as any).cashReceived || cashSales;
    const mpesaReceived = (shift as any).mpesaReceived || mpesaSales;
    const actualCardSales = (shift as any).cardSales || cardSales;
    const expectedCash = (shift as any).expectedCash || ((shift as any).openingFloatCash || 0) + cashReceived - cashDropsTotal - expensesTotal;
    const expectedMpesa = (shift as any).expectedMpesa || ((shift as any).openingFloatMpesa || 0) + mpesaReceived;

    return NextResponse.json({ 
      success: true, 
      shift: {
        ...shift,
        cashReceived,
        mpesaReceived,
        cardSales: actualCardSales,
        cashDrops: (shift as any).cashDrops || cashDropsTotal,
        expenses: (shift as any).expenses || expensesTotal,
        expectedCash,
        expectedMpesa,
        actualCash: (shift as any).actualCash || 0,
        actualMpesa: (shift as any).actualMpesa || 0,
        variance: (shift as any).variance || 0,
        mpesaVariance: (shift as any).mpesaVariance || 0,
        totalSales: (shift as any).totalSales || (cashReceived + mpesaReceived + actualCardSales),
        totalTransactions: (shift as any).totalTransactions || sales.filter((s: any) => !s.isRefund && s.status !== 'voided').length,
        openingFloatCash: (shift as any).openingFloatCash || 0,
        openingFloatMpesa: (shift as any).openingFloatMpesa || 0,
      }
    });
  } catch (error) {
    console.error('Get shift error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch shift', details: errorMessage }, { status: 500 });
  }
}