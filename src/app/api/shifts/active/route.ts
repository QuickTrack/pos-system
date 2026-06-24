import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import { Shift } from '@/models';
import { getAuthUser } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const query: any = { status: 'open' };

    if (user.role !== 'admin' && user.branch) {
      query.branch = user.branch;
    }

    const shift = await Shift.findOne(query)
      .populate('cashier', 'name email')
      .populate('branch', 'name')
      .populate('register', 'name registerNumber')
      .sort({ startTime: -1 })
      .lean();

    if (!shift) {
      return NextResponse.json({ success: true, shift: null });
    }

    const shiftStart = new Date(shift.startTime);
    const now = new Date();

    // Get branch ID - handle both populated and ObjectId/string cases
    const shiftBranchId = (shift as any).branch?._id 
      ? (shift as any).branch._id.toString() 
      : (shift as any).branch?.toString();

    const salesQuery: any = {
      saleDate: { $gte: shiftStart, $lte: now },
      status: { $in: ['completed', 'pending', 'refunded'] },
    };

    // Only add branch filter if we have a valid branch ID
    if (shiftBranchId) {
      salesQuery.branch = shiftBranchId;
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

      // Only count cash, mpesa, and card payments towards expected cash
      // Account and credit payments are NOT added to cash drawer
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

    const cashReceived = cashSales + mpesaSales + cardSales;

    const cashDropsTotal = await CashDrop.aggregate([
      { $match: { shift: (shift as any)._id, reason: { $in: ['safe_deposit', 'bank_deposit', 'security', 'float_transfer'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).then(r => r[0]?.total || 0);

    const expensesQuery: any = {
      dateTime: { $gte: shiftStart, $lte: now },
      paymentSource: { $in: ['cash_drawer', 'main_till', 'petty_cash'] },
      status: { $in: ['approved', 'pending'] },
    };

    // Only add branch filter if we have a valid branch ID
    if (shiftBranchId) {
      expensesQuery.branch = shiftBranchId;
    }

    const expensesTotal = await Expense.aggregate([
      { $match: expensesQuery },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).then(r => r[0]?.total || 0);

    const expectedCash = (shift as any).openingFloat + cashReceived - cashDropsTotal - expensesTotal;

    return NextResponse.json({
      success: true,
      shift: {
        _id: (shift as any)._id,
        shiftId: shift.shiftId,
        register: (shift as any).register?._id || shift.register,
        registerNumber: shift.registerNumber,
        openingFloat: shift.openingFloat,
        startTime: shift.startTime,
        expectedCash,
        actualCash: (shift as any).actualCash || 0,
        variance: (shift as any).variance || 0,
      },
    });
  } catch (error) {
    console.error('Get active shift error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch active shift', details: errorMessage }, { status: 500 });
  }
}