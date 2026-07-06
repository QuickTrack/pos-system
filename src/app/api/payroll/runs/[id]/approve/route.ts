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

    if (!hasPermission(user.role as Role, 'approve_payroll')) {
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

    if (run.status !== 'calculated' && run.status !== 'review') {
      return NextResponse.json(
        { success: false, error: `Cannot approve payroll run in status ${run.status}` },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const comments = body.comments || '';

    run.approvals.push({
      approverId: new mongoose.Types.ObjectId(user.userId),
      approverName: user.name,
      role: user.role,
      action: 'approved',
      comments,
      timestamp: new Date(),
    });
    run.status = 'approved';
    run.currentStep = 'finalize';

    await run.save();

    const populated = await PayrollRun.findById(run._id)
      .populate('branch', 'name code')
      .populate('processedBy', 'name')
      .lean();

    const serialized = { ...populated, _id: serializeObjectId((populated as any)._id) };

    return NextResponse.json({ success: true, run: serialized });
  } catch (error) {
    console.error('Error approving payroll run:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to approve payroll run' },
      { status: 500 }
    );
  }
}
