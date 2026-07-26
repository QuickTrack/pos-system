import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';

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
    const register = searchParams.get('register');
    const last = searchParams.get('last') === 'true';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const query: any = {};

    if (status) query.status = status;
    if (cashier) query.cashier = cashier;
    if (branch) query.branch = branch;
    if (register) query.register = register;

    if (last) {
      // Get last closed shift for the register
      const lastShift = await Shift.findOne({ ...query, status: 'closed' })
        .sort({ endTime: -1 })
        .lean();
      
      if (lastShift) {
        return NextResponse.json({ 
          success: true, 
          shift: { 
            closingFloat: lastShift.closingFloat,
            closingFloatCash: lastShift.closingFloatCash,
            closingFloatMpesa: lastShift.closingFloatMpesa
          } 
        });
      }
      return NextResponse.json({ success: true, shift: { closingFloat: 0, closingFloatCash: 0, closingFloatMpesa: 0 } });
    }

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

    // Transform shifts to include summary fields
    const transformedShifts = shifts.map((shift: any) => ({
      ...shift,
      openingFloatCash: shift.openingFloatCash || 0,
      openingFloatMpesa: shift.openingFloatMpesa || 0,
      cashReceived: shift.cashReceived || 0,
      mpesaReceived: shift.mpesaReceived || 0,
      cardSales: shift.cardSales || 0,
      cashDrops: shift.cashDrops || 0,
      expenses: shift.expenses || 0,
      expectedCash: shift.expectedCash || 0,
      expectedMpesa: shift.expectedMpesa || 0,
      actualCash: shift.actualCash || 0,
      actualMpesa: shift.actualMpesa || 0,
      mpesaVariance: shift.mpesaVariance || 0,
      totalSales: shift.totalSales || 0,
      totalTransactions: shift.totalTransactions || 0,
    }));

    return NextResponse.json({ success: true, shifts: transformedShifts, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
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
      const existingShift = await Shift.findOne({
        register: registerId,
        status: 'open',
      });

      if (!existingShift) {
        register.isOpen = false;
        register.currentShift = undefined as any;
        await register.save();
      } else if (user.role === 'super_admin') {
        await ActivityLog.create({
          user: user.userId as any,
          userName: user.name,
          action: 'open_shift_override',
          module: 'system',
          description: `Super admin ${user.name} overrode active shift ${existingShift.shiftId} (cashier: ${existingShift.cashierName}) on register ${register.registerNumber}`,
          branch: register.branch,
        });
      } else {
        return NextResponse.json({
          error: 'An active shift is already in progress',
          activeShift: {
            shiftId: existingShift.shiftId,
            cashierName: existingShift.cashierName,
            startTime: existingShift.startTime,
          },
          requiresExchange: true,
        }, { status: 409 });
      }
    } else {
      const existingShift = await Shift.findOne({
        register: registerId,
        status: 'open',
      });

      if (existingShift) {
        if (user.role === 'super_admin') {
          await ActivityLog.create({
            user: user.userId as any,
            userName: user.name,
            action: 'open_shift_override',
            module: 'system',
            description: `Super admin ${user.name} overrode active shift ${existingShift.shiftId} (cashier: ${existingShift.cashierName}) on register ${register.registerNumber}`,
            branch: register.branch,
          });
        } else {
          return NextResponse.json({
            error: 'An active shift is already in progress',
            activeShift: {
              shiftId: existingShift.shiftId,
              cashierName: existingShift.cashierName,
              startTime: existingShift.startTime,
            },
            requiresExchange: true,
          }, { status: 409 });
        }
      }
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

    if (!populated) {
      return NextResponse.json({ error: 'Failed to load opened shift' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      shift: {
        _id: (populated as any)._id,
        shiftId: populated.shiftId,
        cashier: (populated as any).cashier?._id ? (populated as any).cashier._id.toString() : populated.cashier,
        cashierName: populated.cashierName,
        register: (populated as any).register?._id || populated.register,
        registerNumber: populated.registerNumber,
        branch: (populated as any).branch?._id ? (populated as any).branch._id.toString() : populated.branch,
        branchName: (populated as any).branch?.name || '',
        openingFloat: populated.openingFloat,
        openingFloatCash: populated.openingFloatCash,
        openingFloatMpesa: populated.openingFloatMpesa,
        startTime: populated.startTime,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Open shift error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to open shift', details: errorMessage }, { status: 500 });
  }
}
