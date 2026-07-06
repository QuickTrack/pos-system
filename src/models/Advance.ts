import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAdvance extends Document {
  employee: mongoose.Types.ObjectId;
  employeeName: string;
  employeeNumber: string;
  branch?: mongoose.Types.ObjectId;
  department?: string;
  amount: number;
  reason?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'disbursed' | 'completed' | 'cancelled';
  requestedDate: Date;
  approvedDate?: Date;
  disbursedDate?: Date;
  completedDate?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  approvedByName?: string;
  repaymentStartDate?: Date;
  repaymentAmount: number;
  repaymentFrequency: 'per_payroll' | 'weekly' | 'monthly';
  totalInstallments: number;
  paidInstallments: number;
  remainingBalance: number;
  remainingInstallments: number;
  isInterestFree: boolean;
  interestRate: number;
  totalAmount: number;
  totalRepaid: number;
  outstandingBalance: number;
  payrollRuns: mongoose.Types.ObjectId[];
  notes?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdvanceSchema = new Schema<IAdvance>(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    employeeName: { type: String, required: true },
    employeeNumber: { type: String, required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    department: { type: String },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'disbursed', 'completed', 'cancelled'],
      default: 'pending',
    },
    requestedDate: { type: Date, default: Date.now },
    approvedDate: { type: Date },
    disbursedDate: { type: Date },
    completedDate: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedByName: { type: String },
    repaymentStartDate: { type: Date },
    repaymentAmount: { type: Number, default: 0, min: 0 },
    repaymentFrequency: {
      type: String,
      enum: ['per_payroll', 'weekly', 'monthly'],
      default: 'per_payroll',
    },
    totalInstallments: { type: Number, default: 0, min: 0 },
    paidInstallments: { type: Number, default: 0, min: 0 },
    remainingBalance: { type: Number, default: 0, min: 0 },
    remainingInstallments: { type: Number, default: 0, min: 0 },
    isInterestFree: { type: Boolean, default: true },
    interestRate: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, default: 0, min: 0 },
    totalRepaid: { type: Number, default: 0, min: 0 },
    outstandingBalance: { type: Number, default: 0, min: 0 },
    payrollRuns: [{ type: Schema.Types.ObjectId, ref: 'PayrollRun' }],
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdByName: { type: String },
  },
  { timestamps: true }
);

AdvanceSchema.index({ employee: 1 });
AdvanceSchema.index({ employeeNumber: 1 });
AdvanceSchema.index({ branch: 1 });
AdvanceSchema.index({ approvalStatus: 1 });
AdvanceSchema.index({ requestedDate: -1 });

const Advance: Model<IAdvance> =
  mongoose.models.Advance || mongoose.model<IAdvance>('Advance', AdvanceSchema);

export default Advance;
