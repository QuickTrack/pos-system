import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPayrollApprovalHistoryEntry {
  step: number;
  approverId: mongoose.Types.ObjectId;
  approverName: string;
  role: string;
  action: 'approved' | 'rejected' | 'skipped';
  comments?: string;
  actionDate: Date;
}

export interface IPayrollApproval extends Document {
  payrollRun: mongoose.Types.ObjectId;
  step: number;
  stepName: string;
  maxSteps: number;
  currentApprover?: mongoose.Types.ObjectId;
  currentApproverRole?: string;
  action: 'pending' | 'approved' | 'rejected' | 'skipped';
  comments?: string;
  actionDate?: Date;
  history: IPayrollApprovalHistoryEntry[];
  nextApprover?: mongoose.Types.ObjectId;
  nextApproverRole?: string;
  isCompleted: boolean;
  status: 'in_progress' | 'approved' | 'rejected' | 'cancelled';
  createdBy?: mongoose.Types.ObjectId;
  createdByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PayrollApprovalHistoryEntrySchema = new Schema<IPayrollApprovalHistoryEntry>(
  {
    step: { type: Number, required: true },
    approverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approverName: { type: String, required: true },
    role: { type: String, required: true },
    action: { type: String, enum: ['approved', 'rejected', 'skipped'], required: true },
    comments: { type: String },
    actionDate: { type: Date, default: Date.now },
  },
  { _id: false }
);

const PayrollApprovalSchema = new Schema<IPayrollApproval>(
  {
    payrollRun: { type: Schema.Types.ObjectId, ref: 'PayrollRun', required: true },
    step: { type: Number, default: 1, min: 1 },
    stepName: { type: String, required: true },
    maxSteps: { type: Number, default: 1, min: 1 },
    currentApprover: { type: Schema.Types.ObjectId, ref: 'User' },
    currentApproverRole: { type: String },
    action: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'skipped'],
      default: 'pending',
    },
    comments: { type: String },
    actionDate: { type: Date },
    history: [PayrollApprovalHistoryEntrySchema],
    nextApprover: { type: Schema.Types.ObjectId, ref: 'User' },
    nextApproverRole: { type: String },
    isCompleted: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['in_progress', 'approved', 'rejected', 'cancelled'],
      default: 'in_progress',
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdByName: { type: String },
  },
  { timestamps: true }
);

PayrollApprovalSchema.index({ payrollRun: 1 });
PayrollApprovalSchema.index({ currentApprover: 1, status: 1 });
PayrollApprovalSchema.index({ status: 1 });

const PayrollApproval: Model<IPayrollApproval> =
  mongoose.models.PayrollApproval || mongoose.model<IPayrollApproval>('PayrollApproval', PayrollApprovalSchema);

export default PayrollApproval;
