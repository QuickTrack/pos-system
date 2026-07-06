import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPayrollApprovalEntry {
  approverId: mongoose.Types.ObjectId;
  approverName: string;
  role: string;
  action: 'approved' | 'rejected';
  comments?: string;
  timestamp: Date;
}

export interface IPayrollRun extends Document {
  name: string;
  description?: string;
  periodStart: Date;
  periodEnd: Date;
  payPeriod: 'monthly' | 'weekly' | 'bi_weekly' | 'custom';
  branch?: mongoose.Types.ObjectId;
  department?: string;
  status: 'draft' | 'processing' | 'calculated' | 'review' | 'approved' | 'finalized' | 'published' | 'reversed';
  totalEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  totalPAYE: number;
  totalNSSF: number;
  totalSHIF: number;
  totalHousingLevy: number;
  totalAdvancesRecovered: number;
  totalLoanRecovered: number;
  processedBy?: mongoose.Types.ObjectId;
  processedByName?: string;
  processedAt?: Date;
  publishedAt?: Date;
  approvals: IPayrollApprovalEntry[];
  currentStep: 'select_period' | 'import_data' | 'calculate' | 'preview' | 'approval' | 'finalize' | 'payslips';
  attendanceImported: boolean;
  overtimeImported: boolean;
  leaveImported: boolean;
  notes?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PayrollApprovalEntrySchema = new Schema<IPayrollApprovalEntry>(
  {
    approverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approverName: { type: String, required: true },
    role: { type: String, required: true },
    action: { type: String, enum: ['approved', 'rejected'], required: true },
    comments: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const PayrollRunSchema = new Schema<IPayrollRun>(
  {
    name: { type: String, required: true },
    description: { type: String },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    payPeriod: {
      type: String,
      enum: ['monthly', 'weekly', 'bi_weekly', 'custom'],
      required: true,
    },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    department: { type: String },
    status: {
      type: String,
      enum: ['draft', 'processing', 'calculated', 'review', 'approved', 'finalized', 'published', 'reversed'],
      default: 'draft',
    },
    totalEmployees: { type: Number, default: 0, min: 0 },
    totalGross: { type: Number, default: 0, min: 0 },
    totalDeductions: { type: Number, default: 0, min: 0 },
    totalNet: { type: Number, default: 0, min: 0 },
    totalPAYE: { type: Number, default: 0, min: 0 },
    totalNSSF: { type: Number, default: 0, min: 0 },
    totalSHIF: { type: Number, default: 0, min: 0 },
    totalHousingLevy: { type: Number, default: 0, min: 0 },
    totalAdvancesRecovered: { type: Number, default: 0, min: 0 },
    totalLoanRecovered: { type: Number, default: 0, min: 0 },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    processedByName: { type: String },
    processedAt: { type: Date },
    publishedAt: { type: Date },
    approvals: [PayrollApprovalEntrySchema],
    currentStep: {
      type: String,
      enum: ['select_period', 'import_data', 'calculate', 'preview', 'approval', 'finalize', 'payslips'],
      default: 'select_period',
    },
    attendanceImported: { type: Boolean, default: false },
    overtimeImported: { type: Boolean, default: false },
    leaveImported: { type: Boolean, default: false },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdByName: { type: String },
  },
  { timestamps: true }
);

PayrollRunSchema.index({ name: 1 });
PayrollRunSchema.index({ branch: 1, status: 1 });
PayrollRunSchema.index({ periodStart: -1, periodEnd: -1 });
PayrollRunSchema.index({ status: 1 });

const PayrollRun: Model<IPayrollRun> =
  mongoose.models.PayrollRun || mongoose.model<IPayrollRun>('PayrollRun', PayrollRunSchema);

export default PayrollRun;
