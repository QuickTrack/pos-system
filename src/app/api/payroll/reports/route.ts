import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import PayrollRun from '@/models/PayrollRun';
import PayrollItem from '@/models/PayrollItem';
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
    const type = searchParams.get('type') || 'summary';
    const periodStart = searchParams.get('periodStart');
    const periodEnd = searchParams.get('periodEnd');
    const branch = searchParams.get('branch');
    const department = searchParams.get('department');
    const reportType = searchParams.get('reportType');

    const query: any = {};
    if (periodStart) query.periodStart = { $gte: new Date(periodStart) };
    if (periodEnd) query.periodEnd = { $lte: new Date(periodEnd) };

    if (user.role !== 'admin' && user.role !== 'super_admin' && user.branch) {
      query.branch = new mongoose.Types.ObjectId(user.branch);
    }
    if (branch && (user.role === 'admin' || user.role === 'super_admin')) {
      query.branch = new mongoose.Types.ObjectId(branch);
    }
    if (department) query.department = department;

    const runs = await PayrollRun.find(query).lean();

    if (runs.length === 0) {
      return NextResponse.json({
        success: true,
        report: {
          type,
          periodStart,
          periodEnd,
          branch,
          department,
          totals: {
            totalEmployees: 0,
            totalGross: 0,
            totalDeductions: 0,
            totalNet: 0,
            totalPAYE: 0,
            totalNSSF: 0,
            totalSHIF: 0,
            totalHousingLevy: 0,
            totalAdvancesRecovered: 0,
            totalLoanRecovered: 0,
          },
          items: [],
          departments: [],
          branches: [],
        },
      });
    }

    const runIds = runs.map((r: any) => r._id);
    const itemQuery: any = { payrollRun: { $in: runIds } };
    if (department) itemQuery.department = department;
    if (branch && (user.role === 'admin' || user.role === 'super_admin')) {
      itemQuery.branch = new mongoose.Types.ObjectId(branch);
    }

    const items = await PayrollItem.find(itemQuery)
      .populate('employee', 'name')
      .populate('branch', 'name code')
      .lean();

    const totals = runs.reduce((acc: any, r: any) => {
      acc.totalEmployees += r.totalEmployees || 0;
      acc.totalGross += r.totalGross || 0;
      acc.totalDeductions += r.totalDeductions || 0;
      acc.totalNet += r.totalNet || 0;
      acc.totalPAYE += r.totalPAYE || 0;
      acc.totalNSSF += r.totalNSSF || 0;
      acc.totalSHIF += r.totalSHIF || 0;
      acc.totalHousingLevy += r.totalHousingLevy || 0;
      acc.totalAdvancesRecovered += r.totalAdvancesRecovered || 0;
      acc.totalLoanRecovered += r.totalLoanRecovered || 0;
      return acc;
    }, {
      totalEmployees: 0, totalGross: 0, totalDeductions: 0, totalNet: 0,
      totalPAYE: 0, totalNSSF: 0, totalSHIF: 0, totalHousingLevy: 0,
      totalAdvancesRecovered: 0, totalLoanRecovered: 0,
    });

    const byDepartment: Record<string, any> = {};
    const byBranch: Record<string, any> = {};

    for (const item of items as any[]) {
      const dept = item.department || 'unassigned';
      if (!byDepartment[dept]) {
        byDepartment[dept] = { department: dept, count: 0, gross: 0, net: 0, deductions: 0 };
      }
      byDepartment[dept].count += 1;
      byDepartment[dept].gross += item.grossEarnings || 0;
      byDepartment[dept].net += item.netSalary || 0;
      byDepartment[dept].deductions += item.totalDeductions || 0;

      const branchName = item.branch?.name || 'unassigned';
      if (!byBranch[branchName]) {
        byBranch[branchName] = { branch: branchName, count: 0, gross: 0, net: 0, deductions: 0 };
      }
      byBranch[branchName].count += 1;
      byBranch[branchName].gross += item.grossEarnings || 0;
      byBranch[branchName].net += item.netSalary || 0;
      byBranch[branchName].deductions += item.totalDeductions || 0;
    }

    const detailItems = (items as any[]).map((item) => ({
      employeeId: serializeObjectId(item.employee?._id || item.employee),
      employeeName: item.employeeName,
      employeeNumber: item.employeeNumber,
      department: item.department || '',
      grossEarnings: item.grossEarnings,
      totalDeductions: item.totalDeductions,
      netSalary: item.netSalary,
      paye: item.paye,
      nssfEmployee: item.nssfEmployee,
      shifEmployee: item.shifEmployee,
      housingLevy: item.housingLevy,
      branch: item.branch?.name || '',
    }));

    const report = {
      type,
      reportType: reportType || type,
      periodStart,
      periodEnd,
      branch,
      department,
      totals: roundTotals(totals),
      departments: Object.values(byDepartment).map(roundTotals),
      branches: Object.values(byBranch).map(roundTotals),
      items: detailItems,
    };

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error('Error generating payroll report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate payroll report' },
      { status: 500 }
    );
  }
}

function roundTotals(obj: any): any {
  const result: any = {};
  for (const key of Object.keys(obj)) {
    result[key] = typeof obj[key] === 'number' ? Math.round((obj[key] + Number.EPSILON) * 100) / 100 : obj[key];
  }
  return result;
}
