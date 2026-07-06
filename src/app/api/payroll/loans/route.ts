import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Loan from '@/models/Loan';
import Branch from '@/models/Branch';
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
    const loanType = searchParams.get('loanType');
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
    if (loanType) query.loanType = loanType;

    if (search) {
      query.$or = [
        { employeeName: { $regex: search, $options: 'i' } },
        { employeeNumber: { $regex: search, $options: 'i' } },
        { purpose: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [loans, total] = await Promise.all([
      Loan.find(query)
        .populate('employee', 'name email')
        .populate('branch', 'name code')
        .populate('approvedBy', 'name')
        .sort({ requestedDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Loan.countDocuments(query),
    ]);

    const serialized = loans.map((l: any) => ({
      ...l,
      _id: serializeObjectId(l._id),
      employee: serializePopulated(l.employee),
      branch: serializePopulated(l.branch),
      approvedBy: serializePopulated(l.approvedBy),
    }));

    return NextResponse.json({
      success: true,
      loans: serialized,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching loans:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch loans' },
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

    if (!hasPermission(user.role as Role, 'manage_loans')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const body = await request.json();
    const {
      employee, amount, loanType, interestRate, purpose, branch, installmentAmount,
      installmentFrequency, totalInstallments, repaymentMethod, startDate, notes,
    } = body;

    if (!employee || amount === undefined || !loanType || !installmentFrequency) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: employee, amount, loanType, installmentFrequency' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(employee)) {
      return NextResponse.json({ success: false, error: 'Invalid employee ID' }, { status: 400 });
    }

    const empUser = await User.findById(employee);
    if (!empUser) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 400 });
    }

    let loanBranch: any = null;
    if (branch && mongoose.Types.ObjectId.isValid(branch)) {
      const branchDoc = await Branch.findById(branch);
      if (!branchDoc) {
        return NextResponse.json({ success: false, error: 'Invalid branch' }, { status: 400 });
      }
      loanBranch = new mongoose.Types.ObjectId(branch);
    }
    if (!loanBranch && user.branch) {
      loanBranch = new mongoose.Types.ObjectId(user.branch);
    }

    const principal = Number(amount);
    const rate = Number(interestRate) || 0;
    const totalInst = Number(totalInstallments) || 1;
    const totalRepayment = round2(principal + (principal * rate * totalInst) / 100);

    const loan = await Loan.create({
      employee: new mongoose.Types.ObjectId(employee),
      employeeName: empUser.name,
      employeeNumber: empUser._id.toString(),
      branch: loanBranch,
      department: '',
      loanType,
      amount: principal,
      interestRate: rate,
      totalRepayment,
      purpose: purpose || '',
      approvalStatus: 'pending',
      requestedDate: new Date(),
      startDate: startDate ? new Date(startDate) : undefined,
      approvedBy: undefined,
      installmentAmount: installmentAmount !== undefined ? Number(installmentAmount) : round2(totalRepayment / totalInst),
      installmentFrequency,
      totalInstallments: totalInst,
      paidInstallments: 0,
      remainingInstallments: totalInst,
      principalPaid: 0,
      interestPaid: 0,
      remainingBalance: totalRepayment,
      repaymentMethod: repaymentMethod || 'salary_deduction',
      payrollRuns: [],
      notes: notes || '',
      createdBy: new mongoose.Types.ObjectId(user.userId),
      createdByName: user.name,
    });

    const populated = await Loan.findById(loan._id)
      .populate('employee', 'name email')
      .populate('branch', 'name code')
      .lean();

    const serialized = {
      ...(populated as any),
      _id: serializeObjectId((populated as any)._id),
      employee: serializePopulated((populated as any).employee),
      branch: serializePopulated((populated as any).branch),
    };

    return NextResponse.json({ success: true, loan: serialized }, { status: 201 });
  } catch (error) {
    console.error('Error creating loan:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create loan' },
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

    if (!hasPermission(user.role as Role, 'manage_loans')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const body = await request.json();
    const { id, action } = body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Valid loan ID is required' }, { status: 400 });
    }

    const loan = await Loan.findById(id);
    if (!loan) {
      return NextResponse.json({ success: false, error: 'Loan not found' }, { status: 404 });
    }

    switch (action) {
      case 'approve':
        if (loan.approvalStatus !== 'pending') {
          return NextResponse.json({ success: false, error: 'Only pending loans can be approved' }, { status: 400 });
        }
        loan.approvalStatus = 'approved';
        loan.approvedDate = new Date();
        loan.approvedBy = new mongoose.Types.ObjectId(user.userId);
        loan.approvedByName = user.name;
        break;
      case 'reject':
        if (loan.approvalStatus !== 'pending') {
          return NextResponse.json({ success: false, error: 'Only pending loans can be rejected' }, { status: 400 });
        }
        loan.approvalStatus = 'rejected';
        loan.approvedBy = new mongoose.Types.ObjectId(user.userId);
        loan.approvedByName = user.name;
        break;
      case 'activate':
        if (loan.approvalStatus !== 'approved') {
          return NextResponse.json({ success: false, error: 'Only approved loans can be activated' }, { status: 400 });
        }
        loan.approvalStatus = 'active';
        loan.startDate = loan.startDate || new Date();
        break;
      case 'complete':
        if (loan.approvalStatus !== 'active') {
          return NextResponse.json({ success: false, error: 'Only active loans can be completed' }, { status: 400 });
        }
        loan.approvalStatus = 'completed';
        loan.remainingBalance = 0;
        loan.remainingInstallments = 0;
        break;
      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    await loan.save();

    const populated = await Loan.findById(loan._id)
      .populate('employee', 'name email')
      .populate('branch', 'name code')
      .lean();

    const serialized = {
      ...(populated as any),
      _id: serializeObjectId((populated as any)._id),
      employee: serializePopulated((populated as any).employee),
      branch: serializePopulated((populated as any).branch),
    };

    return NextResponse.json({ success: true, loan: serialized });
  } catch (error) {
    console.error('Error updating loan:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update loan' },
      { status: 500 }
    );
  }
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
