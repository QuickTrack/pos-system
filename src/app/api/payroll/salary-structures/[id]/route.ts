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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role as Role, 'manage_payroll')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid salary structure ID' }, { status: 400 });
    }

    const structure = await SalaryStructure.findById(id);
    if (!structure) {
      return NextResponse.json({ success: false, error: 'Salary structure not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      name, description, category, paymentFrequency, amount, rate,
      overtimeMultiplierNormal, overtimeMultiplierWeekend, overtimeMultiplierHoliday,
      isDefault, currency,
    } = body;

    if (name !== undefined) structure.name = name;
    if (description !== undefined) structure.description = description;
    if (category !== undefined) structure.category = category;
    if (paymentFrequency !== undefined) structure.paymentFrequency = paymentFrequency;
    if (amount !== undefined) structure.amount = amount;
    if (rate !== undefined) structure.rate = rate;
    if (currency !== undefined) structure.currency = currency;
    if (overtimeMultiplierNormal !== undefined) structure.overtimeMultiplierNormal = overtimeMultiplierNormal;
    if (overtimeMultiplierWeekend !== undefined) structure.overtimeMultiplierWeekend = overtimeMultiplierWeekend;
    if (overtimeMultiplierHoliday !== undefined) structure.overtimeMultiplierHoliday = overtimeMultiplierHoliday;

    if (isDefault !== undefined) {
      if (isDefault && !structure.isDefault) {
        await SalaryStructure.updateMany({ _id: { $ne: structure._id }, isDefault: true }, { isDefault: false });
      }
      structure.isDefault = !!isDefault;
    }

    await structure.save();

    return NextResponse.json({ success: true, structure: { ...structure.toObject(), _id: serializeObjectId(structure._id) } });
  } catch (error) {
    console.error('Error updating salary structure:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update salary structure' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role as Role, 'manage_payroll')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid salary structure ID' }, { status: 400 });
    }

    const structure = await SalaryStructure.findById(id);
    if (!structure) {
      return NextResponse.json({ success: false, error: 'Salary structure not found' }, { status: 404 });
    }

    await SalaryStructure.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'Salary structure deleted successfully' });
  } catch (error) {
    console.error('Error deleting salary structure:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete salary structure' },
      { status: 500 }
    );
  }
}
