import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import PayrollRun from '@/models/PayrollRun';
import { getAuthUser } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';
import type { Role } from '@/lib/auth';
import mongoose from 'mongoose';

function serializeObjectId(value: any): string {
  if (!value) return '';
  if (typeof value.toString === 'function') return value.toString();
  return String(value);
}

export async function POST(
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

    if (run.status !== 'review' && run.status !== 'calculated') {
      return NextResponse.json(
        { success: false, error: `Cannot approve payroll in ${run.status} status` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action, comments } = body;

    if (!['approved', 'rejected'].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Action must be 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

    if (action === 'rejected' && (!comments || !comments.trim())) {
      return NextResponse.json(
        { success: false, error: 'Comments are required when rejecting' },
        { status: 400 }
      );
    }

    run.approvals.push({
      approverId: new mongoose.Types.ObjectId(user.userId),
      approverName: user.name,
      role: user.role,
      action,
      comments: comments || '',
      timestamp: new Date(),
    });

    if (action === 'approved') {
      run.status = 'approved';
    } else {
      run.status = 'review';
    }

    await run.save();

    const populated = await PayrollRun.findById(run._id)
      .populate('branch', 'name code')
      .populate('processedBy', 'name')
      .populate('approvals.approverId', 'name')
      .lean();

    const serialized = {
      ...(populated as any),
      _id: serializeObjectId((populated as any)._id),
      branch: (populated as any).branch,
      processedBy: (populated as any).processedBy,
      approvals: ((populated as any).approvals || []).map((a: any) => ({
        ...a,
        approverId: a.approverId ? { ...a.approverId, _id: serializeObjectId(a.approverId._id) } : a.approverId,
      })),
    };

    return NextResponse.json({ success: true, run: serialized });
  } catch (error) {
    console.error('Error approving payroll:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to approve payroll' },
      { status: 500 }
    );
  }
}
