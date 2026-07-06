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
    const branch = searchParams.get('branch');
    const department = searchParams.get('department');
    const status = searchParams.get('status');
    const employmentType = searchParams.get('employmentType');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    const query: any = {};

    if (user.role !== 'admin' && user.role !== 'super_admin' && user.branch) {
      query.branch = new mongoose.Types.ObjectId(user.branch);
    }

    if (branch && (user.role === 'admin' || user.role === 'super_admin')) {
      query.branch = new mongoose.Types.ObjectId(branch);
    }

    if (department) query.department = department;
    if (status) query.status = status;
    if (employmentType) query.employmentType = employmentType;

    if (search) {
      query.$or = [
        { employeeName: { $regex: search, $options: 'i' } },
        { employeeNumber: { $regex: search, $options: 'i' } },
        { nationalId: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [profiles, total] = await Promise.all([
      PayrollProfile.find(query)
        .populate('branch', 'name code')
        .populate('salaryStructure', 'name')
        .populate('createdBy', 'name')
        .sort({ employeeName: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PayrollProfile.countDocuments(query),
    ]);

    const serialized = profiles.map((p: any) => ({
      ...p,
      _id: serializeObjectId(p._id),
      branch: serializePopulated(p.branch),
      salaryStructure: serializePopulated(p.salaryStructure),
      createdBy: serializePopulated(p.createdBy),
    }));

    return NextResponse.json({
      success: true,
      profiles: serialized,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching payroll profiles:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payroll profiles' },
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

    if (!hasPermission(user.role as Role, 'manage_employees')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const body = await request.json();
    const {
      employeeNumber,
      employeeName,
      nationalId,
      kraPin,
      nssfNumber,
      shifNumber,
      bankName,
      bankBranch,
      bankAccountNumber,
      mobileMoneyNumber,
      email,
      department,
      position,
      branch,
      employmentType,
      contractType,
      employmentDate,
      salaryStructure,
      paymentFrequency,
      basicSalary,
      housingAllowance,
      transportAllowance,
      medicalAllowance,
      responsibilityAllowance,
      communicationAllowance,
      otherAllowances,
      overtimeEligible,
      overtimeRateMultiplier,
      weeklyOffDays,
    } = body;

    if (!employeeNumber || !employeeName || !employmentType || !paymentFrequency || basicSalary === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: employeeNumber, employeeName, employmentType, paymentFrequency, basicSalary' },
        { status: 400 }
      );
    }

    const existing = await PayrollProfile.findOne({ employeeNumber });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Employee number already exists' },
        { status: 400 }
      );
    }

    let profileBranch: any = null;
    if (branch && mongoose.Types.ObjectId.isValid(branch)) {
      const branchDoc = await Branch.findById(branch);
      if (!branchDoc) {
        return NextResponse.json({ success: false, error: 'Invalid branch' }, { status: 400 });
      }
      profileBranch = new mongoose.Types.ObjectId(branch);
    }
    if (!profileBranch && user.branch) {
      profileBranch = new mongoose.Types.ObjectId(user.branch);
    }

    const profile = await PayrollProfile.create({
      employeeNumber,
      employeeName,
      nationalId: nationalId || '',
      kraPin: kraPin || '',
      nssfNumber: nssfNumber || '',
      shifNumber: shifNumber || '',
      bankName: bankName || '',
      bankBranch: bankBranch || '',
      bankAccountNumber: bankAccountNumber || '',
      mobileMoneyNumber: mobileMoneyNumber || '',
      email: email || '',
      department: department || '',
      position: position || '',
      branch: profileBranch,
      employmentType,
      contractType: contractType || 'full_time',
      employmentDate: employmentDate ? new Date(employmentDate) : undefined,
      salaryStructure: salaryStructure && mongoose.Types.ObjectId.isValid(salaryStructure) ? new mongoose.Types.ObjectId(salaryStructure) : undefined,
      paymentFrequency,
      basicSalary: Number(basicSalary),
      housingAllowance: Number(housingAllowance) || 0,
      transportAllowance: Number(transportAllowance) || 0,
      medicalAllowance: Number(medicalAllowance) || 0,
      responsibilityAllowance: Number(responsibilityAllowance) || 0,
      communicationAllowance: Number(communicationAllowance) || 0,
      otherAllowances: Number(otherAllowances) || 0,
      overtimeEligible: overtimeEligible ?? false,
      overtimeRateMultiplier: Number(overtimeRateMultiplier) || 1.5,
      weeklyOffDays: weeklyOffDays || [],
      status: 'active',
      isActive: true,
      createdBy: new mongoose.Types.ObjectId(user.userId),
    });

    const populated = await PayrollProfile.findById(profile._id)
      .populate('branch', 'name code')
      .populate('salaryStructure', 'name')
      .populate('createdBy', 'name')
      .lean();

    const serialized = serializePopulated(populated);

    return NextResponse.json({ success: true, profile: serialized }, { status: 201 });
  } catch (error) {
    console.error('Error creating payroll profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create payroll profile' },
      { status: 500 }
    );
  }
}
