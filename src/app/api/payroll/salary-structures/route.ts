import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import SalaryStructure from '@/models/SalaryStructure';
import { getAuthUser } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';
import type { Role } from '@/lib/auth';
import mongoose from 'mongoose';

function serializeObjectId(value: any): string {
  if (!value) return '';
  if (typeof value.toString === 'function') return value.toString();
  return String(value);
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
    const category = searchParams.get('category');
    const isDefault = searchParams.get('isDefault');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    const query: any = {};

    if (user.role !== 'admin' && user.role !== 'super_admin' && user.branch) {
      query.branch = new mongoose.Types.ObjectId(user.branch);
    }

    if (category) query.category = category;
    if (isDefault === 'true') query.isDefault = true;
    if (isDefault === 'false') query.isDefault = false;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [structures, total] = await Promise.all([
      SalaryStructure.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      SalaryStructure.countDocuments(query),
    ]);

    const serialized = structures.map((s: any) => ({
      ...s,
      _id: serializeObjectId(s._id),
      branch: s.branch ? serializeObjectId(s.branch) : null,
    }));

    return NextResponse.json({
      success: true,
      structures: serialized,
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
      name, description, category, paymentFrequency, amount, rate,
      overtimeMultiplierNormal, overtimeMultiplierWeekend, overtimeMultiplierHoliday,
      isDefault, currency,
    } = body;

    if (!name || !category || !paymentFrequency) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, category, paymentFrequency' },
        { status: 400 }
      );
    }

    let branch: any = null;
    if (user.branch && mongoose.Types.ObjectId.isValid(user.branch)) {
      branch = new mongoose.Types.ObjectId(user.branch);
    }

    if (isDefault) {
      await SalaryStructure.updateMany({ isDefault: true }, { isDefault: false });
    }

    const structure = await SalaryStructure.create({
      name,
      description: description || '',
      category,
      paymentFrequency,
      amount: amount || 0,
      rate: rate || 0,
      currency: currency || 'KES',
      overtimeMultiplierNormal: overtimeMultiplierNormal ?? 1.5,
      overtimeMultiplierWeekend: overtimeMultiplierWeekend ?? 1.5,
      overtimeMultiplierHoliday: overtimeMultiplierHoliday ?? 2,
      isDefault: !!isDefault,
      branch,
      createdBy: new mongoose.Types.ObjectId(user.userId),
    });

    return NextResponse.json({ success: true, structure: { ...structure.toObject(), _id: serializeObjectId(structure._id) } }, { status: 201 });
  } catch (error) {
    console.error('Error creating salary structure:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create salary structure' },
      { status: 500 }
    );
  }
}
