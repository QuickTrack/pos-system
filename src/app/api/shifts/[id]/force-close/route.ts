import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';

import dbConnect from '@/lib/db/mongodb';
import { Shift, Register, ActivityLog, Sale, CashDrop, Expense } from '@/models';
import { getAuthUser } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: only super admin can force-close a shift' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;
    const data = await request.json();

    const { notes } = data;

    const shift = await Shift.findById(id);
    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    if (shift.status !== 'open') {
      return NextResponse.json({ error: 'Shift is not active' }, { status: 400 });
    }

    const shiftStart = shift.startTime;
    const now = new Date();

    const sales = await Sale.find({
      saleDate: { $gte: shiftStart, $lte: now },
      status: { $in: ['completed', 'pending', 'refunded'] },
      branch: shift.branch,
    }).lean();

    let cashSales = 0;
    let mpesaSales = 0;
    let cardSales = 0;

    for (const sale of sales) {
      if (sale.isRefund || sale.status === 'voided') continue;
      if (sale.paymentMethod === 'cash') cashSales += sale.total;
      else if (sale.paymentMethod === 'mpesa') mpesaSales += sale.total;
      else if (sale.paymentMethod === 'card') cardSales += sale.total;
    }

    const cashDropsTotal = await CashDrop.aggregate([
      { $match: { shift: shift._id, reason: { $in: ['safe_deposit', 'bank_deposit', 'security', 'float_transfer'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).then(r => r[0]?.total || 0);

    const expensesTotal = await Expense.aggregate([
      { $match: { paymentSource: { $in: ['cash_drawer', 'main_till', 'petty_cash'] }, status: { $in: ['approved', 'pending'] }, shift: shift._id } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).then(r => r[0]?.total || 0);

    const expectedCash = (shift.openingFloatCash || 0) + cashSales - cashDropsTotal - expensesTotal;
    const actualCash = expectedCash;
    const variance = actualCash - expectedCash;

    shift.closingFloat = actualCash;
    shift.closingFloatCash = actualCash;
    shift.closingFloatMpesa = mpesaSales;
    shift.cashReceived = cashSales;
    shift.mpesaReceived = mpesaSales;
    shift.cardSales = cardSales;
    shift.cashDrops = cashDropsTotal;
    shift.expenses = expensesTotal;
    shift.expectedCash = expectedCash;
    shift.actualCash = actualCash;
    shift.variance = variance;
    shift.totalSales = cashSales + mpesaSales + cardSales;
    shift.totalTransactions = sales.filter((s: any) => !s.isRefund && s.status !== 'voided').length;
    shift.status = 'closed';
    shift.endTime = now;
    shift.closingCashCount = actualCash;
    shift.closingNotes = notes || 'Force-closed by super admin';
    shift.supervisorVerified = true;
    shift.verifiedBy = user.userId;
    shift.verifiedByName = user.name;
    shift.verifiedAt = now;

    await shift.save();

    const register = await Register.findById(shift.register);
    if (register) {
      register.isOpen = false;
      register.currentShift = undefined;
      register.balance = actualCash;
      register.lastZRead = now;
      await register.save();
    }

    await ActivityLog.create({
      user: user.userId as any,
      userName: user.name,
      action: 'force_close_shift',
      module: 'system',
      description: `Super admin ${user.name} force-closed shift ${shift.shiftId} (cashier: ${shift.cashierName}). Reason: ${notes || 'No reason provided'}`,
      branch: shift.branch,
    });

    return NextResponse.json({
      success: true,
      message: `Shift ${shift.shiftId} force-closed by super admin`,
      shift,
      shiftSummary: {
        shiftId: shift.shiftId,
        date: now,
        startTime: shift.startTime,
        endTime: now,
        cashierName: shift.cashierName,
        registerNumber: shift.registerNumber,
        openingFloat: shift.openingFloat || 0,
        cashReceived: cashSales,
        mpesaReceived: mpesaSales,
        cardSales: cardSales,
        cashDrops: cashDropsTotal,
        expenses: expensesTotal,
        expectedCash,
        actualCash,
        variance,
        totalSales: cashSales + mpesaSales + cardSales,
        totalTransactions: shift.totalTransactions,
        notes: shift.closingNotes,
      },
      autoLogout: true,
    }, { status: 200 });
  } catch (error) {
    console.error('Force close shift error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to force-close shift', details: errorMessage }, { status: 500 });
  }
}