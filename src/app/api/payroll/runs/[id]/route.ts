import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import PayrollRun from '@/models/PayrollRun';
import PayrollItem from '@/models/PayrollItem';
import { getAuthUser } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';
import type { Role } from '@/lib/auth';
import mongoose from 'mongoose';

function serializeObjectId(value: any): string {
  if (!value) return '';
  if (typeof value.toString === 'function') return value.toString();
  return String(value);
}

function serializePopulated(value: any) {
  if (!value) return null;
  const object = typeof value.toObject === 'function' ? value.toObject() : value;
  const id = object?._id || value?._id;
  return {
    ...object,
    _id: serializeObjectId(id),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role as Role, 'view_payroll')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid payroll run ID' }, { status: 400 });
    }

    const run = await PayrollRun.findById(id)
      .populate('branch', 'name code')
      .populate('processedBy', 'name email')
      .populate('approvals.approverId', 'name')
      .lean();

    if (!run) {
      return NextResponse.json({ success: false, error: 'Payroll run not found' }, { status: 404 });
    }

    const items = await PayrollItem.find({ payrollRun: new mongoose.Types.ObjectId(id) })
      .populate('employee', 'name email')
      .populate('branch', 'name code')
      .sort({ employeeName: 1 })
      .lean();

    const serializedItems = items.map((item: any) => ({
      ...item,
      _id: serializeObjectId(item._id),
      employee: serializePopulated(item.employee),
      branch: serializePopulated(item.branch),
    }));

    const serializedRun = {
      ...run,
      _id: serializeObjectId((run as any)._id),
      branch: serializePopulated((run as any).branch),
      processedBy: serializePopulated((run as any).processedBy),
      approvals: ((run as any).approvals || []).map((a: any) => ({
        ...a,
        approverId: serializePopulated(a.approverId),
      })),
      payrollItems: serializedItems,
    };

    return NextResponse.json({ success: true, run: serializedRun });
  } catch (error) {
    console.error('Error fetching payroll run:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payroll run' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role as Role, 'process_payroll')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid payroll run ID' }, { status: 400 });
    }

    const run = await PayrollRun.findById(id);
    if (!run) {
      return NextResponse.json({ success: false, error: 'Payroll run not found' }, { status: 404 });
    }

    const body = await request.json();
    const { notes, status } = body;

    const allowedTransitions: Record<string, string[]> = {
      draft: ['processing', 'calculated', 'review'],
      processing: ['calculated', 'review', 'draft'],
      calculated: ['review', 'processing'],
      review: ['approved', 'calculated'],
      approved: ['finalized', 'review'],
    };

    if (status && status !== run.status) {
      const allowed = allowedTransitions[run.status as string] || [];
      if (!allowed.includes(status)) {
        return NextResponse.json(
          { success: false, error: `Cannot transition from ${run.status} to ${status}` },
          { status: 400 }
        );
      }
      run.status = status;
    }

    if (notes !== undefined) {
      run.notes = notes;
    }

    await run.save();

    const populated = await PayrollRun.findById(run._id)
      .populate('branch', 'name code')
      .populate('processedBy', 'name')
      .lean();

    const serialized = serializePopulated(populated);

    return NextResponse.json({ success: true, run: serialized });
  } catch (error) {
    console.error('Error updating payroll run:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update payroll run' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role as Role, 'manage_payroll')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid payroll run ID' }, { status: 400 });
    }

    const run = await PayrollRun.findById(id);
    if (!run) {
      return NextResponse.json({ success: false, error: 'Payroll run not found' }, { status: 404 });
    }

    await PayrollItem.deleteMany({ payrollRun: new mongoose.Types.ObjectId(id) });
    await PayrollRun.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'Payroll run deleted successfully' });
  } catch (error) {
    console.error('Error deleting payroll run:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete payroll run' },
      { status: 500 }
    );
  }
}
