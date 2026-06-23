import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/mongodb';
import { Variance, Shift, User, Branch, ActivityLog } from '@/models';
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
    const shift = searchParams.get('shift');
    const branch = searchParams.get('branch');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const query: any = {};

    if (shift) query.shift = shift;
    if (branch) query.branch = branch;
    if (type) query.type = type;
    if (status) query.status = status;

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (user.role !== 'admin' && user.branch) {
      query.branch = user.branch;
    }

    const skip = (page - 1) * limit;

    const [variances, total] = await Promise.all([
      Variance.find(query)
        .populate('shift', 'shiftId startTime')
        .populate('branch', 'name')
        .populate('approvedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Variance.countDocuments(query),
    ]);

    return NextResponse.json({ success: true, variances, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Get variances error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch variances', details: errorMessage }, { status: 500 });
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

    const { shiftId, type, amount, explanation } = data;

    if (!shiftId || !type || !amount || !explanation) {
      return NextResponse.json({ error: 'Shift, type, amount, and explanation are required' }, { status: 400 });
    }

    const shift = await Shift.findById(shiftId);
    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    await ActivityLog.create({
      user: user.userId as any,
      userName: user.name,
      action: 'create_variance',
      module: 'system',
      description: `Created ${type} variance of KES ${amount} for shift ${shift.shiftId}: ${explanation}`,
      branch: shift.branch,
    });

    return NextResponse.json({ success: true, message: 'Variance recorded' }, { status: 201 });
  } catch (error) {
    console.error('Create variance error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to create variance', details: errorMessage }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role as any, 'manage_reconciliation')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const { id, status, notes } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: 'ID and status are required' }, { status: 400 });
    }

    const variance = await Variance.findById(id);
    if (!variance) {
      return NextResponse.json({ error: 'Variance not found' }, { status: 404 });
    }

    variance.status = status;
    if (notes) variance.notes = notes;
    if (status === 'approved') {
      variance.approvedBy = new mongoose.Types.ObjectId(user.userId);
      variance.approvedByName = user.name;
    }

    await variance.save();

    await ActivityLog.create({
      user: user.userId as any,
      userName: user.name,
      action: 'update_variance',
      module: 'system',
      description: `Updated variance ${variance.varianceId} to ${status}`,
      branch: variance.branch,
    });

    return NextResponse.json({ success: true, variance }, { status: 200 });
  } catch (error) {
    console.error('Update variance error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to update variance', details: errorMessage }, { status: 500 });
  }
}
