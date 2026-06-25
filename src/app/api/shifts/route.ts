import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import { Shift, Register, Sale, CashDrop, Expense, ActivityLog } from '@/models';
import { getAuthUser } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';
import { generateShiftId } from '@/lib/reconciliation-utils';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const cashier = searchParams.get('cashier');
    const branch = searchParams.get('branch');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const query: any = {};

    if (status) query.status = status;
    if (cashier) query.cashier = cashier;
    if (branch) query.branch = branch;

    if (startDate && endDate) {
      query.startTime = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (user.role !== 'admin' && user.branch) {
      query.branch = user.branch;
    }

    const skip = (page - 1) * limit;

    const [shifts, total] = await Promise.all([
      Shift.find(query)
        .populate('cashier', 'name email')
        .populate('branch', 'name')
        .populate('register', 'name registerNumber')
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Shift.countDocuments(query),
    ]);

    return NextResponse.json({ success: true, shifts, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Get shifts error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch shifts', details: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role as any, 'manage_reconciliation')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const data = await request.json();

    const { registerId, openingFloatCash, openingFloatMpesa } = data;

    if (!registerId || openingFloatCash === undefined || openingFloatMpesa === undefined) {
      return NextResponse.json({ error: 'Register, cash float, and M-Pesa balance are required' }, { status: 400 });
    }

    const openingFloat = (parseFloat(openingFloatCash) || 0) + (parseFloat(openingFloatMpesa) || 0);

    const register = await Register.findById(registerId);
    if (!register) {
      return NextResponse.json({ error: 'Register not found' }, { status: 404 });
    }

    if (register.isOpen) {
      return NextResponse.json({ error: 'This register already has an open shift' }, { status: 400 });
    }

    const shiftId = await generateShiftId();

    const shift = await Shift.create({
      shiftId,
      cashier: user.userId,
      cashierName: user.name,
      register: registerId,
      registerNumber: register.registerNumber,
      branch: register.branch,
      openingFloat,
      openingFloatCash: parseFloat(openingFloatCash) || 0,
      openingFloatMpesa: parseFloat(openingFloatMpesa) || 0,
      status: 'open',
      startTime: new Date(),
    });

    register.currentShift = (shift as any)._id;
    register.isOpen = true;
    register.balance = openingFloat;
    await register.save();

    await ActivityLog.create({
      user: user.userId as any,
      userName: user.name,
      action: 'open_shift',
      module: 'system',
      description: `Opened shift ${shiftId} at register ${register.registerNumber}`,
      branch: register.branch,
    });

    const populated = await Shift.findById((shift as any)._id)
      .populate('cashier', 'name email')
      .populate('branch', 'name')
      .populate('register', 'name registerNumber')
      .lean();

    return NextResponse.json({ success: true, shift: populated }, { status: 201 });
  } catch (error) {
    console.error('Open shift error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to open shift', details: errorMessage }, { status: 500 });
  }
}
