import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Earning from '@/models/Earning';
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
    const isActive = searchParams.get('isActive');
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
    if (isActive !== null && isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [earnings, total] = await Promise.all([
      Earning.find(query)
        .populate('branch', 'name code')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Earning.countDocuments(query),
    ]);

    const serialized = earnings.map((e: any) => ({
      ...e,
      _id: serializeObjectId(e._id),
      branch: serializePopulated(e.branch),
    }));

    return NextResponse.json({
      success: true,
      earnings: serialized,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching earnings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch earnings' },
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
      name, description, code, category, type, percentageOf, fixedAmount,
      formula, isPercentage, rate, isTaxable, isPensionable, appliesToEmploymentTypes, branch,
    } = body;

    if (!name || !code || !category || !type) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, code, category, type' },
        { status: 400 }
      );
    }

    const existing = await Earning.findOne({ code });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Earning code already exists' }, { status: 400 });
    }

    let earningBranch: any = null;
    if (branch && mongoose.Types.ObjectId.isValid(branch)) {
      const branchDoc = await Branch.findById(branch);
      if (!branchDoc) {
        return NextResponse.json({ success: false, error: 'Invalid branch' }, { status: 400 });
      }
      earningBranch = new mongoose.Types.ObjectId(branch);
    }
    if (!earningBranch && user.branch) {
      earningBranch = new mongoose.Types.ObjectId(user.branch);
    }

    const earning = await Earning.create({
      name,
      description: description || '',
      code,
      category,
      type,
      percentageOf: percentageOf || undefined,
      fixedAmount: fixedAmount !== undefined ? Number(fixedAmount) : undefined,
      formula: formula || '',
      isPercentage: isPercentage ?? false,
      rate: rate !== undefined ? Number(rate) : undefined,
      isTaxable: isTaxable ?? true,
      isPensionable: isPensionable ?? false,
      isActive: true,
      appliesToEmploymentTypes: appliesToEmploymentTypes || [],
      branch: earningBranch,
      createdBy: new mongoose.Types.ObjectId(user.userId),
    });

    const populated = await Earning.findById(earning._id).populate('branch', 'name code').lean();
    const serialized = serializePopulated(populated);

    return NextResponse.json({ success: true, earning: serialized }, { status: 201 });
  } catch (error) {
    console.error('Error creating earning:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create earning' },
      { status: 500 }
    );
  }
}
