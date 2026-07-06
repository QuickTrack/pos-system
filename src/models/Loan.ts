import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILoan extends Document {
  employee: mongoose.Types.ObjectId;
  employeeName: string;
  employeeNumber: string;
  branch?: mongoose.Types.ObjectId;
  department?: string;
  loanType: 'company_loan' | 'emergency_loan' | 'welfare_loan' | 'other';
  amount: number;
  interestRate: number;
  totalRepayment: number;
  purpose?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'active' | 'completed' | 'defaulted';
  requestedDate: Date;
  approvedDate?: Date;
  startDate?: Date;
  endDate?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  approvedByName?: string;
  installmentAmount: number;
  installmentFrequency: 'monthly' | 'bi_weekly' | 'weekly';
  totalInstallments: number;
  paidInstallments: number;
  remainingInstallments: number;
  principalPaid: number;
  interestPaid: number;
  remainingBalance: number;
  repaymentMethod: 'salary_deduction' | 'bank_transfer' | 'mpesa' | 'cheque';
  payrollRuns: mongoose.Types.ObjectId[];
  notes?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LoanSchema = new Schema<ILoan>(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    employeeName: { type: String, required: true },
    employeeNumber: { type: String, required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    department: { type: String },
    loanType: {
      type: String,
      enum: ['company_loan', 'emergency_loan', 'welfare_loan', 'other'],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    interestRate: { type: Number, default: 0, min: 0 },
    totalRepayment: { type: Number, default: 0, min: 0 },
    purpose: { type: String },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'active', 'completed', 'defaulted'],
      default: 'pending',
    },
    requestedDate: { type: Date, default: Date.now },
    approvedDate: { type: Date },
    startDate: { type: Date },
    endDate: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedByName: { type: String },
    installmentAmount: { type: Number, default: 0, min: 0 },
    installmentFrequency: {
      type: String,
      enum: ['monthly', 'bi_weekly', 'weekly'],
      default: 'monthly',
    },
    totalInstallments: { type: Number, default: 0, min: 0 },
    paidInstallments: { type: Number, default: 0, min: 0 },
    remainingInstallments: { type: Number, default: 0, min: 0 },
    principalPaid: { type: Number, default: 0, min: 0 },
    interestPaid: { type: Number, default: 0, min: 0 },
    remainingBalance: { type: Number, default: 0, min: 0 },
    repaymentMethod: {
      type: String,
      enum: ['salary_deduction', 'bank_transfer', 'mpesa', 'cheque'],
      default: 'salary_deduction',
    },
    payrollRuns: [{ type: Schema.Types.ObjectId, ref: 'PayrollRun' }],
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdByName: { type: String },
  },
  { timestamps: true }
);

LoanSchema.index({ employee: 1 });
LoanSchema.index({ employeeNumber: 1 });
LoanSchema.index({ branch: 1 });
LoanSchema.index({ approvalStatus: 1 });
LoanSchema.index({ requestedDate: -1 });

const Loan: Model<ILoan> =
  mongoose.models.Loan || mongoose.model<ILoan>('Loan', LoanSchema);

export default Loan;
