import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import PayrollRun from '@/models/PayrollRun';
import PayrollItem from '@/models/PayrollItem';
import Payslip from '@/models/Payslip';
import { getAuthUser } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';
import type { Role } from '@/lib/auth';
import mongoose from 'mongoose';

function serializeObjectId(value: any): string {
  if (!value) return '';
  if (typeof value.toString === 'function') return value.toString();
  return String(value);
}

async function generateReference(): Promise<string> {
  const count = await Payslip.countDocuments();
  const year = new Date().getFullYear();
  return `PSL-${year}-${String(count + 1).padStart(6, '0')}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role as Role, 'manage_payslips')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid payroll run ID' }, { status: 400 });
    }

    const run = await PayrollRun.findById(id);
    if (!run) {
      return NextResponse.json({ success: false, error: 'Payroll run not found' }, { status: 404 });
    }

    const items = await PayrollItem.find({ payrollRun: run._id }).lean();

    const payslips: any[] = [];
    for (const item of items as any[]) {
      const existing = await Payslip.findOne({ payrollRun: run._id, employee: item.employee });
      if (existing) {
        payslips.push(existing);
        continue;
      }

      const referenceNumber = await generateReference();
      const allowances = (item.earnings || [])
        .filter((e: any) => e.type !== 'basic_salary')
        .map((e: any) => ({ name: e.type, amount: e.amount }));

      const deductions = (item.deductions || []).map((d: any) => ({
        name: d.type,
        amount: d.amount,
        category: d.category,
        isStatutory: !!d.statutoryType,
      }));

      const payslip = await Payslip.create({
        payrollRun: run._id,
        employee: item.employee,
        employeeNumber: item.employeeNumber,
        employeeName: item.employeeName,
        department: item.department,
        position: item.position,
        branch: item.branch,
        employmentType: item.employmentType,
        payPeriodStart: run.periodStart,
        payPeriodEnd: run.periodEnd,
        grossPay: item.grossEarnings,
        allowances,
        overtimeEarnings: item.overtimeAmount,
        commissionEarnings: item.commissionAmount,
        bonusEarnings: item.bonusAmount,
        otherEarnings: item.otherEarnings,
        totalEarnings: item.totalEarnings,
        deductions,
        totalDeductions: item.totalDeductions,
        netPay: item.netSalary,
        paye: item.paye,
        nssfEmployee: item.nssfEmployee,
        shifEmployee: item.shifEmployee,
        housingLevy: item.housingLevy,
        advanceDeductions: item.advanceDeductions,
        loanDeductions: item.loanDeductions,
        referenceNumber,
        paymentStatus: 'pending',
        createdBy: new mongoose.Types.ObjectId(user.userId),
        createdByName: user.name,
      });
      payslips.push(payslip);
    }

    return NextResponse.json({
      success: true,
      message: 'Payslips generated successfully',
      payslips: payslips.map((p) => ({ ...(p.toObject?.() ?? p), _id: serializeObjectId(p._id) })),
    });
  } catch (error) {
    console.error('Error generating payslips:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate payslips' },
      { status: 500 }
    );
  }
}
