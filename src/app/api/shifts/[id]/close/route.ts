import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import { Shift, Register, Sale, CashDrop, Expense, ActivityLog } from '@/models';
import { getAuthUser } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';
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
    if (!shift || shift.status !== 'open') {
      return NextResponse.json({ error: 'Invalid or closed shift' }, { status: 404 });
    }

    const shiftBranchId = (shift as any).branch?._id 
      ? (shift as any).branch._id.toString() 
      : (shift as any).branch?.toString();

    const shiftStart = new Date(shift.startTime);
    const now = new Date();

    const salesQuery: any = {
      saleDate: { $gte: shiftStart, $lte: now },
      status: { $in: ['completed', 'pending', 'refunded'] },
    };

    if (shiftBranchId) {
      salesQuery.branch = new mongoose.Types.ObjectId(shiftBranchId);
    }

    const sales = await Sale.find(salesQuery).lean();

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
        { $and: [{ shift: null }, { dateTime: { $gte: shiftStart, $lte: now } }] },
      ],
    };

    if (shiftBranchId) {
      expensesQuery.branch = new mongoose.Types.ObjectId(shiftBranchId);
    }

    const expensesTotal = await Expense.aggregate([
      { $match: expensesQuery },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).then(r => r[0]?.total || 0);

    const cashReceived = cashSales;
    const mpesaReceived = mpesaSales;
    const expectedCash = (shift as any).openingFloatCash + cashReceived - cashDropsTotal - expensesTotal;
    const expectedMpesa = (shift as any).openingFloatMpesa + mpesaReceived;
    const actualCash = (shift as any).actualCash || 0;
    const variance = actualCash - expectedCash;

    return NextResponse.json({
      success: true,
      shiftId: (shift as any).shiftId,
      cashierName: (shift as any).cashierName,
      registerNumber: (shift as any).registerNumber,
      openingFloat: (shift as any).openingFloat,
      openingFloatCash: (shift as any).openingFloatCash,
      openingFloatMpesa: (shift as any).openingFloatMpesa,
      startTime: (shift as any).startTime,
      expectedCash,
      expectedMpesa,
      cashReceived,
      mpesaReceived,
      cardSales,
      actualCash,
      variance,
    });
  } catch (error) {
    console.error('Get shift for close error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to load shift', details: errorMessage }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role as any, 'manage_reconciliation')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;
    const data = await request.json();

    const { actualCash, actualMpesa, notes, supervisorVerified, verifiedBy, verifiedByName } = data;

    const shift = await Shift.findById(id);
    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    if (shift.status !== 'open') {
      return NextResponse.json({ error: 'Shift is not open' }, { status: 400 });
    }

    const shiftBranchId = (shift as any).branch?._id 
      ? (shift as any).branch._id.toString() 
      : (shift as any).branch?.toString();

    const shiftStart = new Date(shift.startTime);
    const now = new Date();

    const salesQuery: any = {
      saleDate: { $gte: shiftStart, $lte: now },
      status: { $in: ['completed', 'pending', 'refunded'] },
    };

    if (shiftBranchId) {
      salesQuery.branch = new mongoose.Types.ObjectId(shiftBranchId);
    }

    const Sale = (await import('@/models/Sale')).default;
    const CashDrop = (await import('@/models/CashDrop')).default;
    const Expense = (await import('@/models/Expense')).default;

    const sales = await Sale.find(salesQuery).lean();

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

    const cashReceived = cashSales;
    const mpesaReceived = mpesaSales;
    const cashDropsTotal = await CashDrop.aggregate([
      { $match: { shift: (shift as any)._id, reason: { $in: ['safe_deposit', 'bank_deposit', 'security', 'float_transfer'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).then(r => r[0]?.total || 0);

    const expensesQuery: any = {
      paymentSource: { $in: ['cash_drawer', 'main_till', 'petty_cash'] },
      status: { $in: ['approved', 'pending'] },
      $or: [
        { shift: (shift as any)._id },
        { shift: null, dateTime: { $gte: shiftStart, $lte: now } },
      ],
    };

    if (shiftBranchId) {
      expensesQuery.branch = new mongoose.Types.ObjectId(shiftBranchId);
    }

    const expensesTotal = await Expense.aggregate([
      { $match: expensesQuery },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).then(r => r[0]?.total || 0);

    const expectedCash = (shift as any).openingFloatCash + cashReceived - cashDropsTotal - expensesTotal;
    const expectedMpesa = (shift as any).openingFloatMpesa + mpesaReceived;
    const mpesaVariance = actualMpesa - expectedMpesa;
    const closingFloat = actualCash;
    const variance = actualCash - expectedCash;

    shift.closingFloat = closingFloat;
    shift.closingFloatCash = actualCash;
    shift.closingFloatMpesa = actualMpesa;
    shift.cashReceived = cashReceived;
    shift.mpesaReceived = mpesaReceived;
    shift.cardSales = cardSales;
    shift.cashDrops = cashDropsTotal;
    shift.expenses = expensesTotal;
    shift.expectedCash = expectedCash;
    shift.expectedMpesa = expectedMpesa;
    shift.actualCash = actualCash;
    shift.actualMpesa = actualMpesa;
    shift.variance = variance;
    shift.mpesaVariance = mpesaVariance;
    shift.totalSales = cashReceived + mpesaReceived + cardSales;
    shift.totalTransactions = sales.filter((s: any) => !s.isRefund && s.status !== 'voided').length;
    shift.status = 'closed';
    shift.endTime = now;
    shift.closingCashCount = actualCash;
    shift.closingNotes = notes || '';
    shift.supervisorVerified = !!supervisorVerified;
    shift.verifiedBy = verifiedBy ? verifiedBy : undefined;
    shift.verifiedByName = verifiedByName || '';
    shift.verifiedAt = supervisorVerified ? now : undefined;

    await shift.save();

    const register = await Register.findById((shift as any).register);
    if (register) {
      register.isOpen = false;
      register.currentShift = undefined as any;
      register.balance = actualCash;
      register.lastZRead = now;
      await register.save();
    }

    await ActivityLog.create({
      user: user.userId as any,
      userName: user.name,
      action: 'close_shift',
      module: 'system',
      description: `Closed shift ${shift.shiftId} - Expected: KES ${expectedCash.toFixed(2)}, Actual: KES ${actualCash.toFixed(2)}, Variance: KES ${variance.toFixed(2)}`,
      branch: shift.branch,
    });

    return NextResponse.json({ 
      success: true, 
      shift, 
      autoLogout: true,
      shiftSummary: {
        shiftId: shift.shiftId,
        date: now,
        startTime: shift.startTime,
        endTime: now,
        cashierName: shift.cashierName,
        registerNumber: shift.registerNumber,
        openingFloat: shift.openingFloat || 0,
        openingFloatCash: shift.openingFloatCash || 0,
        openingFloatMpesa: shift.openingFloatMpesa || 0,
        cashReceived: cashReceived,
        mpesaReceived: mpesaReceived,
        cashDrops: cashDropsTotal,
        expenses: expensesTotal,
        expectedCash: expectedCash,
        expectedMpesa: expectedMpesa,
        actualCash: actualCash,
        actualMpesa: actualMpesa,
        variance: variance,
        mpesaVariance: mpesaVariance,
        totalSales: cashReceived + mpesaReceived + cardSales,
        totalTransactions: sales.filter((s: any) => !s.isRefund && s.status !== 'voided').length,
        cardSales: cardSales,
        notes: notes || ''
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Close shift error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to close shift', details: errorMessage }, { status: 500 });
  }
}