import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import SalaryStructure from '@/models/SalaryStructure';
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
    const category = searchParams.get('category');
    const branch = searchParams.get('branch');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    const query: any = {};

    if (user.role !== 'admin' && user.role !== 'super_admin' && user.branch) {
      query.branch = new mongoose.Types.ObjectId(user.branch);
    }

    if (branch && (user.role === 'admin' || user.role === 'super_admin')) {
      query.branch = new mongoose.Types.ObjectId(branch);
    }

    if (category) query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [structures, total] = await Promise.all([
      SalaryStructure.find(query)
        .populate('branch', 'name code')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SalaryStructure.countDocuments(query),
    ]);

    const serialized = structures.map((s: any) => ({
      ...s,
      _id: serializeObjectId(s._id),
      branch: serializePopulated(s.branch),
    }));

    return NextResponse.json({
      success: true,
      salaryStructures: serialized,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching salary structures:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch salary structures' },
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

    if (!hasPermission(user.role as Role, 'manage_payroll')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const body = await request.json();
    const {
      name,
      description,
      category,
      paymentFrequency,
      amount,
      currency,
      workingHoursPerWeek,
      workingDaysPerWeek,
      overtimeMultiplierNormal,
      overtimeMultiplierWeekend,
      overtimeMultiplierHoliday,
      maxOvertimeHoursPerWeek,
      includes,
      isDefault,
      branch,
    } = body;

    if (!name || !category || !paymentFrequency || amount === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, category, paymentFrequency, amount' },
        { status: 400 }
      );
    }

    let structureBranch: any = null;
    if (branch && mongoose.Types.ObjectId.isValid(branch)) {
      const branchDoc = await Branch.findById(branch);
      if (!branchDoc) {
        return NextResponse.json({ success: false, error: 'Invalid branch' }, { status: 400 });
      }
      structureBranch = new mongoose.Types.ObjectId(branch);
    }
    if (!structureBranch && user.branch) {
      structureBranch = new mongoose.Types.ObjectId(user.branch);
    }

    const structure = await SalaryStructure.create({
      name,
      description: description || '',
      category,
      paymentFrequency,
      amount: Number(amount),
      currency: currency || 'KES',
      workingHoursPerWeek: Number(workingHoursPerWeek) || 40,
      workingDaysPerWeek: Number(workingDaysPerWeek) || 5,
      overtimeMultiplierNormal: Number(overtimeMultiplierNormal) || 1.5,
      overtimeMultiplierWeekend: Number(overtimeMultiplierWeekend) || 1.5,
      overtimeMultiplierHoliday: Number(overtimeMultiplierHoliday) || 2,
      maxOvertimeHoursPerWeek: Number(maxOvertimeHoursPerWeek) || 20,
      includes: includes || [],
      isDefault: isDefault ?? false,
      isActive: true,
      branch: structureBranch,
      createdBy: new mongoose.Types.ObjectId(user.userId),
    });

    const populated = await SalaryStructure.findById(structure._id).populate('branch', 'name code').lean();
    const serialized = serializePopulated(populated);

    return NextResponse.json({ success: true, salaryStructure: serialized }, { status: 201 });
  } catch (error) {
    console.error('Error creating salary structure:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create salary structure' },
      { status: 500 }
    );
  }
}
