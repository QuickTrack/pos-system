import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import PayrollRun from '@/models/PayrollRun';
import PayrollItem from '@/models/PayrollItem';
import { getAuthUser } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';
import type { Role } from '@/lib/auth';
import mongoose from 'mongoose';

function serializeObjectId(value: any): string {
  if (!value) return '';
  if (typeof value.toString === 'function') return value.toString();
  return String(value);
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

    if (run.status !== 'draft' && run.status !== 'processing') {
      return NextResponse.json(
        { success: false, error: `Cannot calculate payroll run in status ${run.status}` },
        { status: 400 }
      );
    }

    const items = await PayrollItem.find({ payrollRun: new mongoose.Types.ObjectId(id) }).lean();

    let totalEmployees = 0;
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    let totalPAYE = 0;
    let totalNSSF = 0;
    let totalSHIF = 0;
    let totalHousingLevy = 0;
    let totalAdvancesRecovered = 0;
    let totalLoanRecovered = 0;

    for (const item of items as any[]) {
      totalEmployees += 1;
      totalGross += item.grossPay || 0;
      totalDeductions += (item.totalDeductions || 0);
      totalNet += item.netPay || 0;
      totalPAYE += item.paye || 0;
      totalNSSF += item.nssfEmployee || 0;
      totalSHIF += item.shifEmployee || 0;
      totalHousingLevy += item.housingLevy || 0;
      const advanceTotals = (item.advanceDeductions || []).reduce((sum: number, a: any) => sum + (a.amount || 0), 0);
      const loanTotals = (item.loanDeductions || []).reduce((sum: number, l: any) => sum + (l.amount || 0), 0);
      totalAdvancesRecovered += advanceTotals;
      totalLoanRecovered += loanTotals;
    }

    run.totalEmployees = totalEmployees;
    run.totalGross = totalGross;
    run.totalDeductions = totalDeductions;
    run.totalNet = totalNet;
    run.totalPAYE = totalPAYE;
    run.totalNSSF = totalNSSF;
    run.totalSHIF = totalSHIF;
    run.totalHousingLevy = totalHousingLevy;
    run.totalAdvancesRecovered = totalAdvancesRecovered;
    run.totalLoanRecovered = totalLoanRecovered;
    run.status = 'calculated';
    run.currentStep = 'preview';

    await run.save();

    const populated = await PayrollRun.findById(run._id)
      .populate('branch', 'name code')
      .populate('processedBy', 'name')
      .lean();

    const serialized = { ...populated, _id: serializeObjectId((populated as any)._id) };

    return NextResponse.json({ success: true, run: serialized });
  } catch (error) {
    console.error('Error calculating payroll run:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate payroll run' },
      { status: 500 }
    );
  }
}
