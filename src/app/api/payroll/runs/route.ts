import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import PayrollRun from '@/models/PayrollRun';
import Branch from '@/models/Branch';
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

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role as Role, 'view_payroll')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const branch = searchParams.get('branch');
    const department = searchParams.get('department');
    const periodStart = searchParams.get('periodStart');
    const periodEnd = searchParams.get('periodEnd');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    const query: any = {};

    if (user.role !== 'admin' && user.role !== 'super_admin' && user.branch) {
      query.branch = new mongoose.Types.ObjectId(user.branch);
    }

    if (branch && user.role === 'admin' || (branch && user.role === 'super_admin')) {
      query.branch = new mongoose.Types.ObjectId(branch);
    }

    if (status) {
      const statuses = status.split(',').map((s) => s.trim());
      query.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
    }

    if (department) {
      query.department = department;
    }

    if (periodStart || periodEnd) {
      query.periodStart = {};
      if (periodStart) query.periodStart.$gte = new Date(periodStart);
      if (periodEnd) query.periodEnd = { $lte: new Date(periodEnd) };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [runs, total] = await Promise.all([
      PayrollRun.find(query)
        .populate('branch', 'name code')
        .populate('processedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PayrollRun.countDocuments(query),
    ]);

    const serialized = runs.map((r: any) => ({
      ...r,
      _id: serializeObjectId(r._id),
      branch: serializePopulated(r.branch),
      processedBy: serializePopulated(r.processedBy),
    }));

    return NextResponse.json({
      success: true,
      runs: serialized,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching payroll runs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payroll runs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role as Role, 'process_payroll')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const body = await request.json();
    const { name, description, periodStart, periodEnd, branch, department, payPeriod } = body;

    if (!name || !periodStart || !periodEnd || !payPeriod) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, periodStart, periodEnd, payPeriod' },
        { status: 400 }
      );
    }

    let runBranch: any = null;
    if (branch && mongoose.Types.ObjectId.isValid(branch)) {
      const branchDoc = await Branch.findById(branch);
      if (!branchDoc) {
        return NextResponse.json({ success: false, error: 'Invalid branch' }, { status: 400 });
      }
      runBranch = new mongoose.Types.ObjectId(branch);
    }
    if (!runBranch && user.branch) {
      runBranch = new mongoose.Types.ObjectId(user.branch);
    }

    const run = await PayrollRun.create({
      name,
      description: description || '',
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      payPeriod,
      branch: runBranch,
      department: department || '',
      status: 'draft',
      currentStep: 'calculate',
      processedBy: new mongoose.Types.ObjectId(user.userId),
      processedByName: user.name,
      processedAt: new Date(),
      createdBy: new mongoose.Types.ObjectId(user.userId),
      createdByName: user.name,
    });

    const populated = await PayrollRun.findById(run._id)
      .populate('branch', 'name code')
      .populate('processedBy', 'name')
      .lean();

    const serialized = serializePopulated(populated);

    return NextResponse.json({ success: true, run: serialized }, { status: 201 });
  } catch (error) {
    console.error('Error creating payroll run:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create payroll run' },
      { status: 500 }
    );
  }
}
