import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';

import dbConnect from '@/lib/db/mongodb';
import { Shift, Register, ActivityLog } from '@/models';
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
      return NextResponse.json({ error: 'Forbidden: only super admin can perform cashier exchange' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;
    const data = await request.json();

    const { newCashierId, newCashierName } = data;

    if (!newCashierId || !newCashierName) {
      return NextResponse.json({ error: 'New cashier ID and name are required' }, { status: 400 });
    }

    const shift = await Shift.findById(id);
    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    if (shift.status !== 'open') {
      return NextResponse.json({ error: 'Shift is not active' }, { status: 400 });
    }

    const previousCashierName = shift.cashierName;
    const previousCashierId = shift.cashier;

    shift.cashier = newCashierId;
    shift.cashierName = newCashierName;
    await shift.save();

    const register = await Register.findById(shift.register);
    if (register) {
      register.currentShift = shift._id;
      await register.save();
    }

    await ActivityLog.create({
      user: user.userId as any,
      userName: user.name,
      action: 'cashier_exchange',
      module: 'system',
      description: `Super admin ${user.name} exchanged cashier on shift ${shift.shiftId}: ${previousCashierName} → ${newCashierName}`,
      branch: shift.branch,
    });

    return NextResponse.json({
      success: true,
      message: `Cashier exchanged from ${previousCashierName} to ${newCashierName}`,
      shift: {
        _id: shift._id,
        shiftId: shift.shiftId,
        cashier: shift.cashier,
        cashierName: shift.cashierName,
        register: shift.register,
        registerNumber: shift.registerNumber,
        status: shift.status,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Cashier exchange error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to exchange cashier', details: errorMessage }, { status: 500 });
  }
}