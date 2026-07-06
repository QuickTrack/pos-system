import mongoose from 'mongoose';

export interface TaxBracket {
  min: number;
  max: number;
  rate: number;
  fixed: number;
}

export interface PAYEBreakdownRow {
  min: number;
  max: number;
  taxableAt: number;
  rate: number;
  tax: number;
}

export interface PAYECalculation {
  grossSalary: number;
  taxableIncome: number;
  tax: number;
  effectiveRate: number;
  breakdown: PAYEBreakdownRow[];
}

export interface PAYEResult {
  employee: string;
  employeeName: string;
  grossSalary: number;
  basicSalary: number;
  allowances: number;
  taxableAllowances: number;
  totalEarnings: number;
  overtimeAmount: number;
  commissionAmount: number;
  bonusAmount: number;
  otherEarnings: number;
  grossForTax: number;
  paye: number;
  nhif: number;
  nssfEmployee: number;
  nssfEmployer: number;
  shifEmployee: number;
  shifEmployer: number;
  housingLevyEmployee: number;
  housingLevyEmployer: number;
  totalStatutoryDeductions: number;
  otherDeductions: number;
  totalDeductions: number;
  advanceDeductions: number;
  loanDeductions: number;
  netSalary: number;
  payeDetails: PAYECalculation;
  nssfEmployeeRate: number;
  shifRate: number;
  housingLevyRate: number;
}

const DEFAULT_TAX_BRACKETS: TaxBracket[] = [
  { min: 0, max: 24000, rate: 10, fixed: 0 },
  { min: 24001, max: 32333, rate: 25, fixed: 2400 },
  { min: 32334, max: 500000, rate: 30, fixed: 5258.33 },
  { min: 500001, max: 800000, rate: 32.5, fixed: 122650 },
  { min: 800001, max: Infinity, rate: 35, fixed: 265475 },
];

const DEFAULT_NSSF_TIERS = [
  { min: 0, max: 6000, rate: 0.06 },
  { min: 6000, max: 12000, rate: 0.06 },
];

export function calculatePAYE(taxableIncome: number, brackets: TaxBracket[] = DEFAULT_TAX_BRACKETS): PAYECalculation {
  const income = Math.max(0, taxableIncome);
  const breakdown: PAYEBreakdownRow[] = [];
  let totalTax = 0;

  for (const bracket of brackets) {
    if (income <= bracket.min - 1) continue;
    const upper = bracket.max === Infinity ? income : Math.min(income, bracket.max);
    const taxableAt = Math.max(0, upper - (bracket.min - 1));
    if (taxableAt <= 0) continue;
    const tax = (taxableAt * bracket.rate) / 100;
    totalTax += tax;
    breakdown.push({
      min: bracket.min,
      max: bracket.max,
      taxableAt: round2(taxableAt),
      rate: bracket.rate,
      tax: round2(tax),
    });
  }

  return {
    grossSalary: round2(taxableIncome),
    taxableIncome: round2(income),
    tax: round2(totalTax),
    effectiveRate: income > 0 ? round2((totalTax / income) * 100) : 0,
    breakdown,
  };
}

export function calculateNSSF(
  pensionablePay: number,
  maxPensionablePay: number = 72000,
  rates: { tier1Rate?: number; tier2Rate?: number; tiers?: { min: number; max: number; rate: number }[] } = {}
): { employee: number; employer: number } {
  const tiers = rates.tiers && rates.tiers.length ? rates.tiers : DEFAULT_NSSF_TIERS;
  const capped = Math.min(Math.max(0, pensionablePay), maxPensionablePay);
  let employee = 0;
  let employer = 0;

  for (const tier of tiers) {
    const lower = tier.min;
    const upper = Math.min(tier.max, capped);
    if (upper <= lower) continue;
    const base = upper - lower;
    const employeeContribution = base * tier.rate;
    const employerContribution = base * tier.rate;
    employee += employeeContribution;
    employer += employerContribution;
  }

  return { employee: round2(employee), employer: round2(employer) };
}

export function calculateSHIF(
  grossPay: number,
  maxPensionablePay: number | null = null,
  rate: number = 2.75
): number {
  const base = maxPensionablePay === null ? grossPay : Math.min(grossPay, maxPensionablePay);
  return round2((base * rate) / 100);
}

export function calculateHousingLevy(
  grossPay: number,
  maxIncome: number | null = null,
  rate: number = 1.5
): number {
  const base = maxIncome === null ? grossPay : Math.min(grossPay, maxIncome);
  return round2((base * rate) / 100);
}

export interface CalculateFullPayrollInput {
  employeeId: string;
  employeeName: string;
  basicSalary: number;
  allowances: number;
  taxableAllowances: number;
  overtimeAmount?: number;
  commissionAmount?: number;
  bonusAmount?: number;
  otherEarnings?: number;
  preTaxDeductions?: number;
  postTaxDeductions?: number;
  advanceDeductions?: number;
  loanDeductions?: number;
  nssfOptions?: {
    maxPensionablePay?: number;
    rates?: { tiers?: { min: number; max: number; rate: number }[] };
  };
  shifOptions?: { maxPensionablePay?: number | null; rate?: number };
  housingLevyOptions?: { maxIncome?: number | null; rate?: number };
  includeHousingLevy?: boolean;
  taxBrackets?: TaxBracket[];
}

export function calculateFullPayroll(input: CalculateFullPayrollInput): PAYEResult {
  const basicSalary = num(input.basicSalary);
  const allowances = num(input.allowances);
  const taxableAllowances = num(input.taxableAllowances);
  const overtimeAmount = num(input.overtimeAmount);
  const commissionAmount = num(input.commissionAmount);
  const bonusAmount = num(input.bonusAmount);
  const otherEarnings = num(input.otherEarnings);
  const preTaxDeductions = num(input.preTaxDeductions);
  const postTaxDeductions = num(input.postTaxDeductions);
  const advanceDeductions = num(input.advanceDeductions);
  const loanDeductions = num(input.loanDeductions);

  const grossSalary = round2(basicSalary + allowances + overtimeAmount + commissionAmount + bonusAmount + otherEarnings);
  const taxableIncome = round2(grossSalary - preTaxDeductions);

  const payeDetails = calculatePAYE(taxableIncome, input.taxBrackets);

  const nssfEmployeeRate = 0.06;
  const nssf = calculateNSSF(
    basicSalary,
    input.nssfOptions?.maxPensionablePay ?? 72000,
    input.nssfOptions?.rates ?? {}
  );

  const shifRate = input.shifOptions?.rate ?? 2.75;
  const shifEmployee = calculateSHIF(grossSalary, input.shifOptions?.maxPensionablePay ?? null, shifRate);

  const housingLevyRate = input.housingLevyOptions?.rate ?? 1.5;
  const housingLevyEmployee = input.includeHousingLevy === false
    ? 0
    : calculateHousingLevy(grossSalary, input.housingLevyOptions?.maxIncome ?? null, housingLevyRate);

  const totalStatutoryDeductions = round2(
    payeDetails.tax + nssf.employee + shifEmployee + housingLevyEmployee
  );

  const otherDeductions = round2(postTaxDeductions);
  const totalDeductions = round2(
    totalStatutoryDeductions + otherDeductions + num(advanceDeductions) + num(loanDeductions)
  );

  const netSalary = round2(grossSalary - totalDeductions);

  return {
    employee: input.employeeId,
    employeeName: input.employeeName,
    grossSalary,
    basicSalary,
    allowances,
    taxableAllowances,
    totalEarnings: grossSalary,
    overtimeAmount,
    commissionAmount,
    bonusAmount,
    otherEarnings,
    grossForTax: taxableIncome,
    paye: payeDetails.tax,
    nhif: shifEmployee,
    nssfEmployee: nssf.employee,
    nssfEmployer: nssf.employer,
    shifEmployee,
    shifEmployer: shifEmployee,
    housingLevyEmployee,
    housingLevyEmployer: housingLevyEmployee,
    totalStatutoryDeductions,
    otherDeductions,
    totalDeductions,
    advanceDeductions: round2(advanceDeductions),
    loanDeductions: round2(loanDeductions),
    netSalary,
    payeDetails,
    nssfEmployeeRate,
    shifRate,
    housingLevyRate,
  };
}

function num(value: any): number {
  const n = typeof value === 'number' ? value : parseFloat(value);
  return isFinite(n) ? n : 0;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function toObjectId(id: any): mongoose.Types.ObjectId | null {
  if (!id) return null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  return null;
}
