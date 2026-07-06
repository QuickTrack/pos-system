import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import PayrollJournal from '@/models/PayrollJournal';
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
    const payrollRun = searchParams.get('payrollRun');
    const branch = searchParams.get('branch');
    const status = searchParams.get('status');
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

    if (payrollRun) query.payrollRun = new mongoose.Types.ObjectId(payrollRun);
    if (status) query.status = status;

    if (startDate || endDate) {
      query.journalDate = {};
      if (startDate) query.journalDate.$gte = new Date(startDate);
      if (endDate) query.journalDate.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { referenceNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [journals, total] = await Promise.all([
      PayrollJournal.find(query)
        .populate('payrollRun', 'name')
        .populate('branch', 'name code')
        .populate('postedBy', 'name')
        .sort({ journalDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PayrollJournal.countDocuments(query),
    ]);

    const serialized = journals.map((j: any) => ({
      ...j,
      _id: serializeObjectId(j._id),
      payrollRun: serializePopulated(j.payrollRun),
      branch: serializePopulated(j.branch),
      postedBy: serializePopulated(j.postedBy),
    }));

    return NextResponse.json({
      success: true,
      journals: serialized,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching payroll journals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payroll journals' },
      { status: 500 }
    );
  }
}
