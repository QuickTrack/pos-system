import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import PayrollProfile from '@/models/PayrollProfile';
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role as Role, 'view_payroll')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid profile ID' }, { status: 400 });
    }

    const profile = await PayrollProfile.findById(id)
      .populate('branch', 'name code')
      .populate('salaryStructure', 'name')
      .populate('createdBy', 'name')
      .lean();

    if (!profile) {
      return NextResponse.json({ success: false, error: 'Payroll profile not found' }, { status: 404 });
    }

    const serialized = serializePopulated(profile);

    return NextResponse.json({ success: true, profile: serialized });
  } catch (error) {
    console.error('Error fetching payroll profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payroll profile' },
      { status: 500 }
    );
  }
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

    if (!hasPermission(user.role as Role, 'manage_employees')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid profile ID' }, { status: 400 });
    }

    const profile = await PayrollProfile.findById(id);
    if (!profile) {
      return NextResponse.json({ success: false, error: 'Payroll profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const updatable = [
      'employeeName', 'nationalId', 'kraPin', 'nssfNumber', 'shifNumber',
      'bankName', 'bankBranch', 'bankAccountNumber', 'mobileMoneyNumber', 'email',
      'department', 'position', 'employmentType', 'contractType', 'paymentFrequency',
      'basicSalary', 'housingAllowance', 'transportAllowance', 'medicalAllowance',
      'responsibilityAllowance', 'communicationAllowance', 'otherAllowances',
      'overtimeEligible', 'overtimeRateMultiplier', 'weeklyOffDays', 'status', 'isActive',
    ];

    for (const key of updatable) {
      if (body[key] !== undefined) {
        (profile as any)[key] = body[key];
      }
    }

    if (body.branch && mongoose.Types.ObjectId.isValid(body.branch)) {
      const branchDoc = await Branch.findById(body.branch);
      if (!branchDoc) {
        return NextResponse.json({ success: false, error: 'Invalid branch' }, { status: 400 });
      }
      profile.branch = new mongoose.Types.ObjectId(body.branch);
    }

    if (body.salaryStructure && mongoose.Types.ObjectId.isValid(body.salaryStructure)) {
      profile.salaryStructure = new mongoose.Types.ObjectId(body.salaryStructure);
    }

    if (body.employmentDate) {
      profile.employmentDate = new Date(body.employmentDate);
    }

    await profile.save();

    const populated = await PayrollProfile.findById(profile._id)
      .populate('branch', 'name code')
      .populate('salaryStructure', 'name')
      .populate('createdBy', 'name')
      .lean();

    const serialized = serializePopulated(populated);

    return NextResponse.json({ success: true, profile: serialized });
  } catch (error) {
    console.error('Error updating payroll profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update payroll profile' },
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

    if (!hasPermission(user.role as Role, 'manage_employees')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid profile ID' }, { status: 400 });
    }

    const profile = await PayrollProfile.findById(id);
    if (!profile) {
      return NextResponse.json({ success: false, error: 'Payroll profile not found' }, { status: 404 });
    }

    await PayrollProfile.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'Payroll profile deleted successfully' });
  } catch (error) {
    console.error('Error deleting payroll profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete payroll profile' },
      { status: 500 }
    );
  }
}
