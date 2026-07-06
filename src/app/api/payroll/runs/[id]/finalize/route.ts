import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import PayrollRun from '@/models/PayrollRun';
import PayrollItem from '@/models/PayrollItem';
import Payslip from '@/models/Payslip';
import PayrollJournal from '@/models/PayrollJournal';
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

async function generateReference(prefix: string): Promise<string> {
  const count = await Payslip.countDocuments();
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(count + 1).padStart(6, '0')}`;
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

    if (!hasPermission(user.role as Role, 'process_payroll')) {
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

    if (run.status !== 'approved') {
      return NextResponse.json(
        { success: false, error: `Payroll run must be approved before finalization (current: ${run.status})` },
        { status: 400 }
      );
    }

    const items = await PayrollItem.find({ payrollRun: run._id }).populate('branch', 'name').lean();

    const payslips: any[] = [];
    for (const item of items as any[]) {
      const existingPayslip = await Payslip.findOne({ payrollRun: run._id, employee: item.employee });
      if (existingPayslip) {
        payslips.push(existingPayslip);
        continue;
      }

      const referenceNumber = await generateReference('PSL');
      const allowances = (item.earnings || [])
        .filter((e: any) => e.category === 'allowance' || e.type !== 'basic_salary')
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

    const branchDoc = run.branch ? await Branch.findById(run.branch) : null;
    const journalRef = await PayrollJournal.countDocuments();
    const year = new Date().getFullYear();
    const referenceNumber = `PJR-${year}-${String(journalRef + 1).padStart(5, '0')}`;

    const branchId = run.branch || (branchDoc ? branchDoc._id : undefined);
    const entries: any[] = [];
    let totalDebit = 0;
    let totalCredit = 0;

    if (branchId) {
      entries.push({
        accountCode: 'SAL-EXP',
        accountName: 'Salary Expense',
        description: `Gross salaries for ${run.name}`,
        debit: round2(run.totalGross),
        credit: 0,
        branch: new mongoose.Types.ObjectId(branchId),
      });
      totalDebit += run.totalGross;

      entries.push({
        accountCode: 'PAYE-PAY',
        accountName: 'PAYE Payable',
        description: `PAYE for ${run.name}`,
        debit: 0,
        credit: round2(run.totalPAYE),
        branch: new mongoose.Types.ObjectId(branchId),
      });
      totalCredit += run.totalPAYE;

      entries.push({
        accountCode: 'NSSF-PAY',
        accountName: 'NSSF Payable',
        description: `NSSF for ${run.name}`,
        debit: 0,
        credit: round2(run.totalNSSF),
        branch: new mongoose.Types.ObjectId(branchId),
      });
      totalCredit += run.totalNSSF;

      entries.push({
        accountCode: 'SHIF-PAY',
        accountName: 'SHIF Payable',
        description: `SHIF for ${run.name}`,
        debit: 0,
        credit: round2(run.totalSHIF),
        branch: new mongoose.Types.ObjectId(branchId),
      });
      totalCredit += run.totalSHIF;

      entries.push({
        accountCode: 'HLEV-PAY',
        accountName: 'Housing Levy Payable',
        description: `Housing Levy for ${run.name}`,
        debit: 0,
        credit: round2(run.totalHousingLevy),
        branch: new mongoose.Types.ObjectId(branchId),
      });
      totalCredit += run.totalHousingLevy;

      entries.push({
        accountCode: 'CASH-CTRL',
        accountName: 'Cash Control',
        description: `Net salaries for ${run.name}`,
        debit: 0,
        credit: round2(run.totalNet),
        branch: new mongoose.Types.ObjectId(branchId),
      });
      totalCredit += run.totalNet;

      if (run.totalAdvancesRecovered > 0) {
        entries.push({
          accountCode: 'ADV-REC',
          accountName: 'Advance Recovery',
          description: `Advance recoveries for ${run.name}`,
          debit: round2(run.totalAdvancesRecovered),
          credit: 0,
          branch: new mongoose.Types.ObjectId(branchId),
        });
        totalDebit += run.totalAdvancesRecovered;
      }

      if (run.totalLoanRecovered > 0) {
        entries.push({
          accountCode: 'LOAN-REC',
          accountName: 'Loan Recovery',
          description: `Loan recoveries for ${run.name}`,
          debit: round2(run.totalLoanRecovered),
          credit: 0,
          branch: new mongoose.Types.ObjectId(branchId),
        });
        totalDebit += run.totalLoanRecovered;
      }
    }

    const journal = await PayrollJournal.create({
      payrollRun: run._id,
      referenceNumber,
      journalDate: new Date(),
      description: `Payroll journal for ${run.name}`,
      entries,
      totalDebit: round2(totalDebit),
      totalCredit: round2(totalCredit),
      isBalanced: round2(totalDebit) === round2(totalCredit),
      status: 'draft',
      branch: branchId,
      createdBy: new mongoose.Types.ObjectId(user.userId),
      createdByName: user.name,
      accountingPeriod: `${run.periodStart.getFullYear()}-${String(run.periodStart.getMonth() + 1).padStart(2, '0')}`,
    });

    run.status = 'finalized';
    run.currentStep = 'payslips';
    run.publishedAt = new Date();
    await run.save();

    return NextResponse.json({
      success: true,
      message: 'Payroll finalized successfully',
      payslips: payslips.map((p) => ({ ...p.toObject?.() ?? p, _id: serializeObjectId(p._id) })),
      journal: { ...(journal.toObject?.() ?? journal), _id: serializeObjectId(journal._id) },
      summary: {
        payslipsGenerated: payslips.length,
        journalReference: referenceNumber,
        isBalanced: journal.isBalanced,
      },
    });
  } catch (error) {
    console.error('Error finalizing payroll:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to finalize payroll' },
      { status: 500 }
    );
  }
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
