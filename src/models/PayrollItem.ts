import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPayrollItemEarning {
  type: string;
  category: string;
  amount: number;
  isPercentage: boolean;
  baseAmount: number;
  rate: number;
  formula: string;
  isTaxable: boolean;
  isPensionable: boolean;
}

export interface IPayrollItemDeduction {
  type: string;
  category: string;
  amount: number;
  isPreTax: boolean;
  isPercentage: boolean;
  baseAmount: number;
  rate: number;
  priority: number;
  statutoryType: string;
}

export interface IAdvanceDeduction {
  advanceId: mongoose.Types.ObjectId;
  amount: number;
}

export interface ILoanDeduction {
  loanId: mongoose.Types.ObjectId;
  amount: number;
}

export interface IAttendanceAdjustment {
  type: string;
  amount: number;
  reason: string;
}

export interface IPayrollItem extends Document {
  payrollRun: mongoose.Types.ObjectId;
  employee: mongoose.Types.ObjectId;
  employeeNumber: string;
  employeeName: string;
  department?: string;
  position?: string;
  branch?: mongoose.Types.ObjectId;
  employmentType: string;
  salaryStructure?: mongoose.Types.ObjectId;
  earnings: IPayrollItemEarning[];
  grossEarnings: number;
  totalAllowances: number;
  overtimeHours: number;
  overtimeAmount: number;
  commissionAmount: number;
  bonusAmount: number;
  otherEarnings: number;
  totalEarnings: number;
  deductions: IPayrollItemDeduction[];
  paye: number;
  nssfEmployee: number;
  shifEmployee: number;
  housingLevy: number;
  totalDeductions: number;
  otherDeductions: number;
  netSalary: number;
  advanceDeductions: IAdvanceDeduction[];
  loanDeductions: ILoanDeduction[];
  workingDays: number;
  leaveDays: number;
  unpaidLeaveDays: number;
  overtimeCost: number;
  attendanceAdjustments: IAttendanceAdjustment[];
  notes?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const PayrollItemEarningSchema = new Schema<IPayrollItemEarning>(
  {
    type: { type: String, required: true },
    category: { type: String, required: true },
    amount: { type: Number, default: 0 },
    isPercentage: { type: Boolean, default: false },
    baseAmount: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    formula: { type: String, default: '' },
    isTaxable: { type: Boolean, default: true },
    isPensionable: { type: Boolean, default: false },
  },
  { _id: false }
);

const PayrollItemDeductionSchema = new Schema<IPayrollItemDeduction>(
  {
    type: { type: String, required: true },
    category: { type: String, required: true },
    amount: { type: Number, default: 0 },
    isPreTax: { type: Boolean, default: false },
    isPercentage: { type: Boolean, default: false },
    baseAmount: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    priority: { type: Number, default: 0 },
    statutoryType: { type: String, default: '' },
  },
  { _id: false }
);

const AdvanceDeductionSchema = new Schema<IAdvanceDeduction>(
  {
    advanceId: { type: Schema.Types.ObjectId, ref: 'Advance', required: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const LoanDeductionSchema = new Schema<ILoanDeduction>(
  {
    loanId: { type: Schema.Types.ObjectId, ref: 'Loan', required: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const AttendanceAdjustmentSchema = new Schema<IAttendanceAdjustment>(
  {
    type: { type: String, required: true },
    amount: { type: Number, required: true },
    reason: { type: String },
  },
  { _id: false }
);

const PayrollItemSchema = new Schema<IPayrollItem>(
  {
    payrollRun: { type: Schema.Types.ObjectId, ref: 'PayrollRun', required: true },
    employee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    employeeNumber: { type: String, required: true },
    employeeName: { type: String, required: true },
    department: { type: String },
    position: { type: String },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    employmentType: { type: String, required: true },
    salaryStructure: { type: Schema.Types.ObjectId, ref: 'SalaryStructure' },
    earnings: [PayrollItemEarningSchema],
    grossEarnings: { type: Number, default: 0, min: 0 },
    totalAllowances: { type: Number, default: 0, min: 0 },
    overtimeHours: { type: Number, default: 0, min: 0 },
    overtimeAmount: { type: Number, default: 0, min: 0 },
    commissionAmount: { type: Number, default: 0, min: 0 },
    bonusAmount: { type: Number, default: 0, min: 0 },
    otherEarnings: { type: Number, default: 0, min: 0 },
    totalEarnings: { type: Number, default: 0, min: 0 },
    deductions: [PayrollItemDeductionSchema],
    paye: { type: Number, default: 0, min: 0 },
    nssfEmployee: { type: Number, default: 0, min: 0 },
    shifEmployee: { type: Number, default: 0, min: 0 },
    housingLevy: { type: Number, default: 0, min: 0 },
    totalDeductions: { type: Number, default: 0, min: 0 },
    otherDeductions: { type: Number, default: 0, min: 0 },
    netSalary: { type: Number, default: 0, min: 0 },
    advanceDeductions: [AdvanceDeductionSchema],
    loanDeductions: [LoanDeductionSchema],
    workingDays: { type: Number, default: 0, min: 0 },
    leaveDays: { type: Number, default: 0, min: 0 },
    unpaidLeaveDays: { type: Number, default: 0, min: 0 },
    overtimeCost: { type: Number, default: 0, min: 0 },
    attendanceAdjustments: [AttendanceAdjustmentSchema],
    notes: { type: String },
    status: { type: String, default: 'pending' },
  },
  { timestamps: true }
);

PayrollItemSchema.index({ payrollRun: 1, employee: 1 });
PayrollItemSchema.index({ payrollRun: 1 });
PayrollItemSchema.index({ employee: 1 });
PayrollItemSchema.index({ branch: 1 });

const PayrollItem: Model<IPayrollItem> =
  mongoose.models.PayrollItem || mongoose.model<IPayrollItem>('PayrollItem', PayrollItemSchema);

export default PayrollItem;
