import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import { CashDrop, Shift, User, Branch, ActivityLog } from '@/models';
import { getAuthUser } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';
import { generateCashDropId } from '@/lib/reconciliation-utils';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const shift = searchParams.get('shift');
    const branch = searchParams.get('branch');
    const cashier = searchParams.get('cashier');
    const reason = searchParams.get('reason');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const query: any = {};

    if (shift) query.shift = shift;
    if (branch) query.branch = branch;
    if (cashier) query.cashier = cashier;
    if (reason) query.reason = reason;

    if (startDate && endDate) {
      query.dropTime = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (user.role !== 'admin' && user.branch) {
      query.branch = user.branch;
    }

    const skip = (page - 1) * limit;

    const [drops, total] = await Promise.all([
      CashDrop.find(query)
        .populate('shift', 'shiftId')
        .populate('cashier', 'name email')
        .populate('branch', 'name')
        .populate('authorizedBy', 'name')
        .sort({ dropTime: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CashDrop.countDocuments(query),
    ]);

    return NextResponse.json({ success: true, drops, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Get cash drops error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch cash drops', details: errorMessage }, { status: 500 });
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

    const { shiftId, amount, reason, notes, authorizedById, authorizedByName } = data;

    if (!shiftId || !amount || !reason || !authorizedById || !authorizedByName) {
      return NextResponse.json({ error: 'Shift, amount, reason, and authorization are required' }, { status: 400 });
    }

    const shift = await Shift.findById(shiftId);
    if (!shift || shift.status !== 'open') {
      return NextResponse.json({ error: 'Invalid or closed shift' }, { status: 400 });
    }

    const dropId = await generateCashDropId();

    const drop = await CashDrop.create({
      dropId,
      shift: shiftId,
      cashier: shift.cashier,
      cashierName: shift.cashierName,
      branch: shift.branch,
      registerNumber: shift.registerNumber,
      amount,
      reason,
      authorizedBy: authorizedById,
      authorizedByName,
      notes,
    });

    await ActivityLog.create({
      user: user.userId as any,
      userName: user.name,
      action: 'cash_drop',
      module: 'system',
      description: `Cash drop ${dropId} - KES ${amount} - ${reason}`,
      branch: shift.branch,
    });

    const populated = await CashDrop.findById((drop as any)._id)
      .populate('shift', 'shiftId')
      .populate('cashier', 'name email')
      .populate('branch', 'name')
      .populate('authorizedBy', 'name')
      .lean();

    return NextResponse.json({ success: true, drop: populated }, { status: 201 });
  } catch (error) {
    console.error('Create cash drop error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to create cash drop', details: errorMessage }, { status: 500 });
  }
}
