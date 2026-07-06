import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Advance from '@/models/Advance';
import Branch from '@/models/Branch';
import PayrollProfile from '@/models/PayrollProfile';
import User from '@/models/User';
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
    const search = searchParams.get('search');
    const employee = searchParams.get('employee');
    const branch = searchParams.get('branch');
    const approvalStatus = searchParams.get('approvalStatus');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    const query: any = {};

    if (user.role !== 'admin' && user.role !== 'super_admin' && user.branch) {
      query.branch = new mongoose.Types.ObjectId(user.branch);
    }

    if (branch && (user.role === 'admin' || user.role === 'super_admin')) {
      query.branch = new mongoose.Types.ObjectId(branch);
    }

    if (employee) query.employee = new mongoose.Types.ObjectId(employee);
    if (approvalStatus) query.approvalStatus = approvalStatus;

    if (search) {
      query.$or = [
        { employeeName: { $regex: search, $options: 'i' } },
        { employeeNumber: { $regex: search, $options: 'i' } },
        { reason: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [advances, total] = await Promise.all([
      Advance.find(query)
        .populate('employee', 'name email')
        .populate('branch', 'name code')
        .populate('approvedBy', 'name')
        .sort({ requestedDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Advance.countDocuments(query),
    ]);

    const serialized = advances.map((a: any) => ({
      ...a,
      _id: serializeObjectId(a._id),
      employee: serializePopulated(a.employee),
      branch: serializePopulated(a.branch),
      approvedBy: serializePopulated(a.approvedBy),
    }));

    return NextResponse.json({
      success: true,
      advances: serialized,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching advances:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch advances' },
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

    if (!hasPermission(user.role as Role, 'manage_advances')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const body = await request.json();
    const {
      employee, amount, reason, branch, repaymentStartDate, repaymentAmount,
      repaymentFrequency, totalInstallments, isInterestFree, interestRate, notes,
    } = body;

    if (!employee || amount === undefined || !repaymentFrequency) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: employee, amount, repaymentFrequency' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(employee)) {
      return NextResponse.json({ success: false, error: 'Invalid employee ID' }, { status: 400 });
    }

    const profile = await PayrollProfile.findById(employee).lean();
    let empUser: any = null;
    if (!profile) {
      empUser = await User.findById(employee);
      if (!empUser) {
        return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 400 });
      }
    }

    let advanceBranch: any = null;
    if (branch && mongoose.Types.ObjectId.isValid(branch)) {
      const branchDoc = await Branch.findById(branch);
      if (!branchDoc) {
        return NextResponse.json({ success: false, error: 'Invalid branch' }, { status: 400 });
      }
      advanceBranch = new mongoose.Types.ObjectId(branch);
    }
    if (!advanceBranch && user.branch) {
      advanceBranch = new mongoose.Types.ObjectId(user.branch);
    }

    const total = Number(amount);
    const installments = Number(totalInstallments) || 1;
    const perInstallment = round2(total / installments);

    const advance = await Advance.create({
      employee: new mongoose.Types.ObjectId(employee),
      employeeName: profile ? profile.employeeName : (empUser as any).name,
      employeeNumber: profile ? (profile.employeeNumber || profile._id.toString()) : (empUser as any)._id.toString(),
      branch: advanceBranch,
      department: profile ? (profile.department || '') : '',
      amount: total,
      reason: reason || '',
      approvalStatus: 'pending',
      requestedDate: new Date(),
      repaymentStartDate: repaymentStartDate ? new Date(repaymentStartDate) : undefined,
      repaymentAmount: repaymentAmount !== undefined ? Number(repaymentAmount) : perInstallment,
      repaymentFrequency,
      totalInstallments: installments,
      paidInstallments: 0,
      remainingBalance: total,
      remainingInstallments: installments,
      isInterestFree: isInterestFree ?? true,
      interestRate: Number(interestRate) || 0,
      totalAmount: total,
      totalRepaid: 0,
      outstandingBalance: total,
      payrollRuns: [],
      notes: notes || '',
      createdBy: new mongoose.Types.ObjectId(user.userId),
      createdByName: user.name,
    });

    const populated = await Advance.findById(advance._id)
      .populate('employee', 'name email')
      .populate('branch', 'name code')
      .lean();

    const serialized = {
      ...(populated as any),
      _id: serializeObjectId((populated as any)._id),
      employee: serializePopulated((populated as any).employee),
      branch: serializePopulated((populated as any).branch),
    };

    return NextResponse.json({ success: true, advance: serialized }, { status: 201 });
  } catch (error) {
    console.error('Error creating advance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create advance' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role as Role, 'manage_advances')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const body = await request.json();
    const { id, action } = body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Valid advance ID is required' }, { status: 400 });
    }

    const advance = await Advance.findById(id);
    if (!advance) {
      return NextResponse.json({ success: false, error: 'Advance not found' }, { status: 404 });
    }

    switch (action) {
      case 'approve':
        if (advance.approvalStatus !== 'pending') {
          return NextResponse.json({ success: false, error: 'Only pending advances can be approved' }, { status: 400 });
        }
        advance.approvalStatus = 'approved';
        advance.approvedDate = new Date();
        advance.approvedBy = new mongoose.Types.ObjectId(user.userId);
        advance.approvedByName = user.name;
        break;
      case 'reject':
        if (advance.approvalStatus !== 'pending') {
          return NextResponse.json({ success: false, error: 'Only pending advances can be rejected' }, { status: 400 });
        }
        advance.approvalStatus = 'rejected';
        advance.approvedBy = new mongoose.Types.ObjectId(user.userId);
        advance.approvedByName = user.name;
        break;
      case 'disburse':
        if (advance.approvalStatus !== 'approved') {
          return NextResponse.json({ success: false, error: 'Only approved advances can be disbursed' }, { status: 400 });
        }
        advance.approvalStatus = 'disbursed';
        advance.disbursedDate = new Date();
        break;
      case 'complete':
        if (advance.approvalStatus !== 'disbursed') {
          return NextResponse.json({ success: false, error: 'Only disbursed advances can be completed' }, { status: 400 });
        }
        advance.approvalStatus = 'completed';
        advance.completedDate = new Date();
        advance.remainingBalance = 0;
        advance.remainingInstallments = 0;
        break;
      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    await advance.save();

    const populated = await Advance.findById(advance._id)
      .populate('employee', 'name email')
      .populate('branch', 'name code')
      .lean();

    const serialized = {
      ...(populated as any),
      _id: serializeObjectId((populated as any)._id),
      employee: serializePopulated((populated as any).employee),
      branch: serializePopulated((populated as any).branch),
    };

    return NextResponse.json({ success: true, advance: serialized });
  } catch (error) {
    console.error('Error updating advance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update advance' },
      { status: 500 }
    );
  }
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
