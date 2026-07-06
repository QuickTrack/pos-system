import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPayslipAllowance {
  name: string;
  amount: number;
}

export interface IPayslipDeduction {
  name: string;
  amount: number;
  category: string;
  isStatutory: boolean;
}

export interface IPayslipAdvanceDeduction {
  advanceId: mongoose.Types.ObjectId;
  amount: number;
}

export interface IPayslipLoanDeduction {
  loanId: mongoose.Types.ObjectId;
  amount: number;
}

export interface IPayslip extends Document {
  payrollRun: mongoose.Types.ObjectId;
  employee: mongoose.Types.ObjectId;
  employeeNumber: string;
  employeeName: string;
  kraPin?: string;
  nssfNumber?: string;
  shifNumber?: string;
  department?: string;
  position?: string;
  branch?: mongoose.Types.ObjectId;
  employmentType: string;
  paymentFrequency: string;
  payPeriodStart: Date;
  payPeriodEnd: Date;
  grossPay: number;
  allowances: IPayslipAllowance[];
  overtimeEarnings: number;
  commissionEarnings: number;
  bonusEarnings: number;
  otherEarnings: number;
  totalEarnings: number;
  deductions: IPayslipDeduction[];
  totalDeductions: number;
  netPay: number;
  paye: number;
  nssfEmployee: number;
  shifEmployee: number;
  housingLevy: number;
  advanceDeductions: IPayslipAdvanceDeduction[];
  loanDeductions: IPayslipLoanDeduction[];
  qrCodeData?: string;
  referenceNumber: string;
  digitalSignature?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyKraPin?: string;
  isEmailed: boolean;
  isPrinted: boolean;
  emailedAt?: Date;
  printedAt?: Date;
  paymentStatus: 'pending' | 'processing' | 'paid' | 'failed';
  paymentMethod?: string;
  paymentReference?: string;
  paymentDate?: Date;
  paidBy?: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  createdByName?: string;
  verificationUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PayslipAllowanceSchema = new Schema<IPayslipAllowance>(
  {
    name: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const PayslipDeductionSchema = new Schema<IPayslipDeduction>(
  {
    name: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true },
    isStatutory: { type: Boolean, default: false },
  },
  { _id: false }
);

const PayslipAdvanceDeductionSchema = new Schema<IPayslipAdvanceDeduction>(
  {
    advanceId: { type: Schema.Types.ObjectId, ref: 'Advance', required: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const PayslipLoanDeductionSchema = new Schema<IPayslipLoanDeduction>(
  {
    loanId: { type: Schema.Types.ObjectId, ref: 'Loan', required: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const PayslipSchema = new Schema<IPayslip>(
  {
    payrollRun: { type: Schema.Types.ObjectId, ref: 'PayrollRun', required: true },
    employee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    employeeNumber: { type: String, required: true },
    employeeName: { type: String, required: true },
    kraPin: { type: String },
    nssfNumber: { type: String },
    shifNumber: { type: String },
    department: { type: String },
    position: { type: String },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    employmentType: { type: String, required: true },
    paymentFrequency: { type: String },
    payPeriodStart: { type: Date, required: true },
    payPeriodEnd: { type: Date, required: true },
    grossPay: { type: Number, default: 0, min: 0 },
    allowances: [PayslipAllowanceSchema],
    overtimeEarnings: { type: Number, default: 0, min: 0 },
    commissionEarnings: { type: Number, default: 0, min: 0 },
    bonusEarnings: { type: Number, default: 0, min: 0 },
    otherEarnings: { type: Number, default: 0, min: 0 },
    totalEarnings: { type: Number, default: 0, min: 0 },
    deductions: [PayslipDeductionSchema],
    totalDeductions: { type: Number, default: 0, min: 0 },
    netPay: { type: Number, default: 0, min: 0 },
    paye: { type: Number, default: 0, min: 0 },
    nssfEmployee: { type: Number, default: 0, min: 0 },
    shifEmployee: { type: Number, default: 0, min: 0 },
    housingLevy: { type: Number, default: 0, min: 0 },
    advanceDeductions: [PayslipAdvanceDeductionSchema],
    loanDeductions: [PayslipLoanDeductionSchema],
    qrCodeData: { type: String },
    referenceNumber: { type: String, required: true, unique: true },
    digitalSignature: { type: String },
    companyName: { type: String },
    companyAddress: { type: String },
    companyPhone: { type: String },
    companyEmail: { type: String },
    companyKraPin: { type: String },
    isEmailed: { type: Boolean, default: false },
    isPrinted: { type: Boolean, default: false },
    emailedAt: { type: Date },
    printedAt: { type: Date },
    paymentStatus: {
      type: String,
      enum: ['pending', 'processing', 'paid', 'failed'],
      default: 'pending',
    },
    paymentMethod: { type: String },
    paymentReference: { type: String },
    paymentDate: { type: Date },
    paidBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdByName: { type: String },
    verificationUrl: { type: String },
  },
  { timestamps: true }
);

PayslipSchema.index({ referenceNumber: 1 });
PayslipSchema.index({ payrollRun: 1, employee: 1 });
PayslipSchema.index({ employee: 1 });
PayslipSchema.index({ branch: 1 });
PayslipSchema.index({ paymentStatus: 1 });

const Payslip: Model<IPayslip> =
  mongoose.models.Payslip || mongoose.model<IPayslip>('Payslip', PayslipSchema);

export default Payslip;
