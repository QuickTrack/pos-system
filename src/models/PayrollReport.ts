import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPayrollReport extends Document {
  name: string;
  reportType: 'summary' | 'register' | 'department' | 'branch' | 'overtime' | 'leave' | 'advances' | 'loans' | 'statutory' | 'cost_analysis' | 'custom';
  periodStart: Date;
  periodEnd: Date;
  branch?: mongoose.Types.ObjectId;
  department?: string;
  fileFormat: 'pdf' | 'excel' | 'csv' | 'html';
  fileUrl?: string;
  filePath?: string;
  generatedBy?: mongoose.Types.ObjectId;
  generatedByName?: string;
  generatedAt: Date;
  size: number;
  filters: Record<string, unknown>;
  summaryData: Record<string, unknown>;
  isPublic: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PayrollReportSchema = new Schema<IPayrollReport>(
  {
    name: { type: String, required: true },
    reportType: {
      type: String,
      enum: ['summary', 'register', 'department', 'branch', 'overtime', 'leave', 'advances', 'loans', 'statutory', 'cost_analysis', 'custom'],
      required: true,
    },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    department: { type: String },
    fileFormat: {
      type: String,
      enum: ['pdf', 'excel', 'csv', 'html'],
      required: true,
    },
    fileUrl: { type: String },
    filePath: { type: String },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    generatedByName: { type: String },
    generatedAt: { type: Date, default: Date.now },
    size: { type: Number, default: 0, min: 0 },
    filters: { type: Schema.Types.Mixed, default: {} },
    summaryData: { type: Schema.Types.Mixed, default: {} },
    isPublic: { type: Boolean, default: false },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

PayrollReportSchema.index({ reportType: 1 });
PayrollReportSchema.index({ branch: 1 });
PayrollReportSchema.index({ generatedAt: -1 });
PayrollReportSchema.index({ periodStart: -1, periodEnd: -1 });

const PayrollReport: Model<IPayrollReport> =
  mongoose.models.PayrollReport || mongoose.model<IPayrollReport>('PayrollReport', PayrollReportSchema);

export default PayrollReport;
