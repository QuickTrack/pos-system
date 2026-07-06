import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Payslip from '@/models/Payslip';
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
    const search = searchParams.get('search');
    const employee = searchParams.get('employee');
    const payrollRun = searchParams.get('payrollRun');
    const branch = searchParams.get('branch');
    const paymentStatus = searchParams.get('paymentStatus');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
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
    if (payrollRun) query.payrollRun = new mongoose.Types.ObjectId(payrollRun);
    if (paymentStatus) query.paymentStatus = paymentStatus;

    if (startDate || endDate) {
      query.payPeriodEnd = {};
      if (startDate) query.payPeriodEnd.$gte = new Date(startDate);
      if (endDate) query.payPeriodEnd.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { employeeName: { $regex: search, $options: 'i' } },
        { employeeNumber: { $regex: search, $options: 'i' } },
        { referenceNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [payslips, total] = await Promise.all([
      Payslip.find(query)
        .populate('employee', 'name email')
        .populate('payrollRun', 'name periodStart periodEnd')
        .populate('branch', 'name code')
        .sort({ payPeriodEnd: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payslip.countDocuments(query),
    ]);

    const serialized = payslips.map((p: any) => ({
      ...p,
      _id: serializeObjectId(p._id),
      employee: serializePopulated(p.employee),
      payrollRun: serializePopulated(p.payrollRun),
      branch: serializePopulated(p.branch),
    }));

    return NextResponse.json({
      success: true,
      payslips: serialized,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching payslips:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payslips' },
      { status: 500 }
    );
  }
}
