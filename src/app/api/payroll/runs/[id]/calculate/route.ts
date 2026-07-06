import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import PayrollRun from '@/models/PayrollRun';
import PayrollItem from '@/models/PayrollItem';
import PayrollProfile from '@/models/PayrollProfile';
import Earning from '@/models/Earning';
import Deduction from '@/models/Deduction';
import Advance from '@/models/Advance';
import Loan from '@/models/Loan';
import { getAuthUser } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';
import type { Role } from '@/lib/auth';
import { calculatePAYE, calculateNSSF, calculateSHIF, calculateHousingLevy } from '@/app/api/payroll/utils/kenyan-tax-calculator';
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

    if (!['draft', 'processing', 'calculated', 'review'].includes(run.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot calculate payroll in ${run.status} status` },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const forceRecalculate = body.forceRecalculate === true;

    if (forceRecalculate) {
      await PayrollItem.deleteMany({ payrollRun: run._id });
    }

    run.status = 'processing';
    await run.save();

    const profileQuery: any = { isActive: true, status: 'active' };
    if (run.branch) profileQuery.branch = run.branch;
    if (run.department) profileQuery.department = run.department;

    const profiles = await PayrollProfile.find(profileQuery).populate('salaryStructure').lean();
    const activeEarnings = await Earning.find({ isActive: true }).lean();
    const activeDeductions = await Deduction.find({ isActive: true }).lean();

    const advanceQuery: any = { approvalStatus: { $in: ['approved', 'disbursed'] } };
    if (run.branch) advanceQuery.branch = run.branch;
    const openAdvances = await Advance.find(advanceQuery).lean();

    const loanQuery: any = { approvalStatus: { $in: ['approved', 'active'] } };
    if (run.branch) loanQuery.branch = run.branch;
    const openLoans = await Loan.find(loanQuery).lean();

    const periodStart = run.periodStart;
    const periodEnd = run.periodEnd;

    const createdItems: any[] = [];
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    let totalPAYE = 0;
    let totalNSSF = 0;
    let totalSHIF = 0;
    let totalHousingLevy = 0;
    let totalAdvancesRecovered = 0;
    let totalLoanRecovered = 0;

    for (const profile of profiles as any[]) {
      const existing = await PayrollItem.findOne({ payrollRun: run._id, employee: profile.employee });
      if (existing && !forceRecalculate) continue;

      const basicSalary = num(profile.basicSalary);
      const allowances =
        num(profile.housingAllowance) +
        num(profile.transportAllowance) +
        num(profile.medicalAllowance) +
        num(profile.responsibilityAllowance) +
        num(profile.communicationAllowance) +
        num(profile.otherAllowances);

      const earnings: any[] = [];
      earnings.push({
        type: 'basic_salary',
        category: 'fixed',
        amount: basicSalary,
        isPercentage: false,
        baseAmount: basicSalary,
        rate: 100,
        formula: '',
        isTaxable: true,
        isPensionable: true,
      });
      if (num(profile.housingAllowance) > 0) {
        earnings.push({ type: 'housing_allowance', category: 'allowance', amount: num(profile.housingAllowance), isPercentage: false, baseAmount: num(profile.housingAllowance), rate: 0, formula: '', isTaxable: true, isPensionable: false });
      }
      if (num(profile.transportAllowance) > 0) {
        earnings.push({ type: 'transport_allowance', category: 'allowance', amount: num(profile.transportAllowance), isPercentage: false, baseAmount: num(profile.transportAllowance), rate: 0, formula: '', isTaxable: true, isPensionable: false });
      }
      if (num(profile.medicalAllowance) > 0) {
        earnings.push({ type: 'medical_allowance', category: 'allowance', amount: num(profile.medicalAllowance), isPercentage: false, baseAmount: num(profile.medicalAllowance), rate: 0, formula: '', isTaxable: true, isPensionable: false });
      }
      if (num(profile.responsibilityAllowance) > 0) {
        earnings.push({ type: 'responsibility_allowance', category: 'allowance', amount: num(profile.responsibilityAllowance), isPercentage: false, baseAmount: num(profile.responsibilityAllowance), rate: 0, formula: '', isTaxable: true, isPensionable: false });
      }
      if (num(profile.communicationAllowance) > 0) {
        earnings.push({ type: 'communication_allowance', category: 'allowance', amount: num(profile.communicationAllowance), isPercentage: false, baseAmount: num(profile.communicationAllowance), rate: 0, formula: '', isTaxable: true, isPensionable: false });
      }
      if (num(profile.otherAllowances) > 0) {
        earnings.push({ type: 'other_allowance', category: 'allowance', amount: num(profile.otherAllowances), isPercentage: false, baseAmount: num(profile.otherAllowances), rate: 0, formula: '', isTaxable: true, isPensionable: false });
      }

      for (const earning of activeEarnings) {
        if (earning.category === 'fixed' || earning.category === 'allowance') continue;
        if (earning.appliesToEmploymentTypes && earning.appliesToEmploymentTypes.length > 0 && !earning.appliesToEmploymentTypes.includes(profile.employmentType)) continue;
        let amount = 0;
        if (earning.isPercentage && earning.rate) {
          const base = earning.percentageOf === 'gross_salary' ? allowances + basicSalary : basicSalary;
          amount = (base * earning.rate) / 100;
        } else if (earning.fixedAmount) {
          amount = earning.fixedAmount;
        }
        if (amount > 0) {
          earnings.push({
            type: earning.code,
            category: earning.category,
            amount: round2(amount),
            isPercentage: earning.isPercentage,
            baseAmount: earning.percentageOf === 'gross_salary' ? allowances + basicSalary : basicSalary,
            rate: earning.rate || 0,
            formula: earning.formula || '',
            isTaxable: earning.isTaxable,
            isPensionable: earning.isPensionable,
          });
        }
      }

      const overtimeAmount = 0;
      const commissionAmount = 0;
      const bonusAmount = 0;
      const otherEarnings = 0;
      const grossEarnings = round2(basicSalary + allowances + overtimeAmount + commissionAmount + bonusAmount + otherEarnings);
      const totalAllowances = round2(allowances);
      const totalEarnings = grossEarnings;

      const preTaxDeductions = activeDeductions
        .filter((d: any) => d.isPreTax)
        .reduce((sum: number, d: any) => sum + computeDeduction(d, grossEarnings, basicSalary), 0);

      const deductions: any[] = [];
      const advanceDeductions: any[] = [];
      const loanDeductions: any[] = [];

      const empAdvances = openAdvances.filter((a: any) => a.employee.toString() === (profile.employee?.toString?.() ?? profile.employee));
      for (const adv of empAdvances) {
        const amt = Math.min(num(adv.repaymentAmount) || num(adv.amount) / (num(adv.totalInstallments) || 1), num(adv.outstandingBalance) || num(adv.amount));
        if (amt > 0) {
          advanceDeductions.push({ advanceId: adv._id, amount: round2(amt) });
          deductions.push({ type: 'salary_advance', category: 'advance', amount: round2(amt), isPreTax: false, isPercentage: false, baseAmount: round2(amt), rate: 0, priority: 10, statutoryType: 'advance' });
        }
      }

      const empLoans = openLoans.filter((l: any) => l.employee.toString() === (profile.employee?.toString?.() ?? profile.employee));
      for (const loan of empLoans) {
        const amt = Math.min(num(loan.installmentAmount) || 0, num(loan.remainingBalance) || num(loan.amount));
        if (amt > 0) {
          loanDeductions.push({ loanId: loan._id, amount: round2(amt) });
          deductions.push({ type: 'loan', category: 'loan', amount: round2(amt), isPreTax: false, isPercentage: false, baseAmount: round2(amt), rate: 0, priority: 11, statutoryType: 'loan' });
        }
      }

      const taxableIncome = round2(grossEarnings - preTaxDeductions);
      const payeDetails = calculatePAYE(taxableIncome);
      const paye = payeDetails.tax;

      const nssf = calculateNSSF(basicSalary, 72000);
      const nssfEmployee = nssf.employee;
      const shifEmployee = calculateSHIF(grossEarnings, null, 2.75);
      const housingLevy = calculateHousingLevy(grossEarnings, null, 1.5);

      for (const d of activeDeductions) {
        if (d.statutoryType === 'paye' || d.statutoryType === 'nssf' || d.statutoryType === 'shif' || d.statutoryType === 'housing_levy') continue;
        if ((d.isPreTax || d.category === 'advance' || d.category === 'loan')) continue;
        const amt = computeDeduction(d, grossEarnings, basicSalary);
        if (amt > 0) {
          deductions.push({ type: d.code, category: d.category, amount: round2(amt), isPreTax: d.isPreTax, isPercentage: d.type === 'percentage', baseAmount: d.percentageOf === 'gross_salary' ? grossEarnings : basicSalary, rate: 0, priority: d.priority || 0, statutoryType: d.statutoryType || '' });
        }
      }

      deductions.push({ type: 'paye', category: 'statutory', amount: round2(paye), isPreTax: false, isPercentage: false, baseAmount: taxableIncome, rate: 0, priority: 1, statutoryType: 'paye' });
      deductions.push({ type: 'nssf', category: 'statutory', amount: round2(nssfEmployee), isPreTax: false, isPercentage: false, baseAmount: basicSalary, rate: 6, priority: 2, statutoryType: 'nssf' });
      deductions.push({ type: 'shif', category: 'statutory', amount: round2(shifEmployee), isPreTax: false, isPercentage: false, baseAmount: grossEarnings, rate: 2.75, priority: 3, statutoryType: 'shif' });
      deductions.push({ type: 'housing_levy', category: 'statutory', amount: round2(housingLevy), isPreTax: false, isPercentage: false, baseAmount: grossEarnings, rate: 1.5, priority: 4, statutoryType: 'housing_levy' });

      const advanceTotal = advanceDeductions.reduce((s, a) => s + a.amount, 0);
      const loanTotal = loanDeductions.reduce((s, l) => s + l.amount, 0);
      const otherDeductions = deductions
        .filter((d) => !d.statutoryType || !['paye', 'nssf', 'shif', 'housing_levy'].includes(d.statutoryType))
        .filter((d) => d.category !== 'advance' && d.category !== 'loan')
        .reduce((s, d) => s + d.amount, 0);

      const totalStatutory = round2(paye + nssfEmployee + shifEmployee + housingLevy);
      const totalDeductionsAmount = round2(totalStatutory + otherDeductions + advanceTotal + loanTotal);
      const netSalary = round2(grossEarnings - totalDeductionsAmount);

      const itemData: any = {
        payrollRun: run._id,
        employee: profile.employee,
        employeeNumber: profile.employeeNumber,
        employeeName: profile.employeeName,
        department: profile.department || '',
        position: profile.position || '',
        branch: profile.branch || run.branch,
        employmentType: profile.employmentType,
        salaryStructure: profile.salaryStructure || undefined,
        earnings,
        grossEarnings,
        totalAllowances,
        overtimeHours: 0,
        overtimeAmount,
        commissionAmount,
        bonusAmount,
        otherEarnings,
        totalEarnings,
        deductions,
        paye: round2(paye),
        nssfEmployee: round2(nssfEmployee),
        shifEmployee: round2(shifEmployee),
        housingLevy: round2(housingLevy),
        totalDeductions: totalDeductionsAmount,
        otherDeductions: round2(otherDeductions),
        netSalary,
        advanceDeductions,
        loanDeductions,
        workingDays: 0,
        leaveDays: 0,
        unpaidLeaveDays: 0,
        overtimeCost: 0,
        attendanceAdjustments: [],
        status: 'calculated',
      };

      if (existing) {
        Object.assign(existing, itemData);
        await existing.save();
        createdItems.push(existing);
      } else {
        const created = await PayrollItem.create(itemData);
        createdItems.push(created);
      }

      const empId = profile.employee?.toString?.() ?? profile.employee;
      for (const adv of empAdvances) {
        const amt = Math.min(num(adv.repaymentAmount) || num(adv.amount) / (num(adv.totalInstallments) || 1), num(adv.outstandingBalance) || num(adv.amount));
        if (amt > 0 && !adv.payrollRuns?.includes(run._id)) {
          await Advance.findByIdAndUpdate(adv._id, {
            $push: { payrollRuns: run._id },
            $inc: { paidInstallments: 1, totalRepaid: amt, outstandingBalance: -amt, remainingBalance: -amt },
          });
          if (num(adv.outstandingBalance) - amt <= 0) {
            await Advance.findByIdAndUpdate(adv._id, { approvalStatus: 'completed', completedDate: new Date() });
          }
        }
      }
      for (const loan of empLoans) {
        const amt = Math.min(num(loan.installmentAmount) || 0, num(loan.remainingBalance) || num(loan.amount));
        if (amt > 0 && !loan.payrollRuns?.includes(run._id)) {
          await Loan.findByIdAndUpdate(loan._id, {
            $push: { payrollRuns: run._id },
            $inc: { paidInstallments: 1, principalPaid: amt, remainingBalance: -amt, remainingInstallments: -1 },
          });
          if (num(loan.remainingBalance) - amt <= 0) {
            await Loan.findByIdAndUpdate(loan._id, { approvalStatus: 'completed' });
          }
        }
      }

      totalGross += grossEarnings;
      totalDeductions += totalDeductionsAmount;
      totalNet += netSalary;
      totalPAYE += paye;
      totalNSSF += nssfEmployee;
      totalSHIF += shifEmployee;
      totalHousingLevy += housingLevy;
      totalAdvancesRecovered += advanceTotal;
      totalLoanRecovered += loanTotal;
    }

    run.totalEmployees = createdItems.length;
    run.totalGross = round2(totalGross);
    run.totalDeductions = round2(totalDeductions);
    run.totalNet = round2(totalNet);
    run.totalPAYE = round2(totalPAYE);
    run.totalNSSF = round2(totalNSSF);
    run.totalSHIF = round2(totalSHIF);
    run.totalHousingLevy = round2(totalHousingLevy);
    run.totalAdvancesRecovered = round2(totalAdvancesRecovered);
    run.totalLoanRecovered = round2(totalLoanRecovered);
    run.status = 'calculated';
    run.currentStep = 'preview';
    run.processedBy = new mongoose.Types.ObjectId(user.userId);
    run.processedByName = user.name;
    run.processedAt = new Date();
    await run.save();

    return NextResponse.json({
      success: true,
      message: 'Payroll calculated successfully',
      summary: {
        totalEmployees: createdItems.length,
        totalGross: run.totalGross,
        totalDeductions: run.totalDeductions,
        totalNet: run.totalNet,
        totalPAYE: run.totalPAYE,
        totalNSSF: run.totalNSSF,
        totalSHIF: run.totalSHIF,
        totalHousingLevy: run.totalHousingLevy,
        totalAdvancesRecovered: run.totalAdvancesRecovered,
        totalLoanRecovered: run.totalLoanRecovered,
      },
    });
  } catch (error) {
    console.error('Error calculating payroll:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate payroll' },
      { status: 500 }
    );
  }
}

function num(value: any): number {
  const n = typeof value === 'number' ? value : parseFloat(value);
  return isFinite(n) ? n : 0;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function computeDeduction(d: any, gross: number, basic: number): number {
  if (d.type === 'percentage' && d.rate) {
    const base = d.percentageOf === 'gross_salary' ? gross : basic;
    return (base * d.rate) / 100;
  }
  if (d.type === 'fixed_amount' && d.fixedAmount) {
    return d.fixedAmount;
  }
  return 0;
}
