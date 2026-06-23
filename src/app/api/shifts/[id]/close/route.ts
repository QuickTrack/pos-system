import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import { Shift, Register, Sale, CashDrop, Expense, ActivityLog } from '@/models';
import { getAuthUser } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';

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
    let discounts = 0;
    let returns = 0;

    for (const sale of sales) {
      if (sale.isRefund) {
        returns += sale.total;
        continue;
      }
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

      discounts += sale.discountAmount || 0;
    }

    const cashDropsTotal = await CashDrop.aggregate([
      { $match: { shift: (shift as any)._id, reason: { $in: ['safe_deposit', 'bank_deposit', 'security', 'float_transfer'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).then(r => r[0]?.total || 0);

    const expensesTotal = await Expense.aggregate([
      {
        $match: {
          branch: shift.branch,
          dateTime: { $gte: shiftStart, $lte: now },
          paymentSource: { $in: ['cash_drawer', 'main_till', 'petty_cash'] },
          status: { $in: ['approved', 'pending'] },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).then(r => r[0]?.total || 0);

    const cashReceived = cashSales + mpesaSales + cardSales;
    const expectedCash = (shift as any).openingFloat + cashReceived - cashDropsTotal - expensesTotal;
    const actualCash = (shift as any).actualCash || 0;
    const variance = actualCash - expectedCash;

    return NextResponse.json({
      success: true,
      shiftId: (shift as any).shiftId,
      cashierName: (shift as any).cashierName,
      registerNumber: (shift as any).registerNumber,
      openingFloat: (shift as any).openingFloat,
      startTime: (shift as any).startTime,
      expectedCash,
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

    const { actualCash, notes, supervisorVerified, verifiedBy, verifiedByName } = data;

    const shift = await Shift.findById(id);
    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    if (shift.status !== 'open') {
      return NextResponse.json({ error: 'Shift is not open' }, { status: 400 });
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
    let discounts = 0;
    let returns = 0;

    for (const sale of sales) {
      if (sale.isRefund) {
        returns += sale.total;
        continue;
      }
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

      discounts += sale.discountAmount || 0;
    }

    const cashReceived = cashSales + mpesaSales + cardSales;
    const cashDropsTotal = await CashDrop.aggregate([
      { $match: { shift: (shift as any)._id, reason: { $in: ['safe_deposit', 'bank_deposit', 'security', 'float_transfer'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).then(r => r[0]?.total || 0);

    const expensesTotal = await Expense.aggregate([
      {
        $match: {
          branch: shift.branch,
          dateTime: { $gte: shiftStart, $lte: now },
          paymentSource: { $in: ['cash_drawer', 'main_till', 'petty_cash'] },
          status: { $in: ['approved', 'pending'] },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).then(r => r[0]?.total || 0);

    const expectedCash = shift.openingFloat + cashReceived - cashDropsTotal - expensesTotal;
    const closingFloat = actualCash;
    const variance = actualCash - expectedCash;

    shift.closingFloat = closingFloat;
    shift.expectedCash = expectedCash;
    shift.actualCash = actualCash;
    shift.variance = variance;
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

    return NextResponse.json({ success: true, shift }, { status: 200 });
  } catch (error) {
    console.error('Close shift error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to close shift', details: errorMessage }, { status: 500 });
  }
}