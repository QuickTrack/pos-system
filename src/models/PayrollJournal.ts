import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPayrollJournalEntry {
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
  branch: mongoose.Types.ObjectId;
}

export interface IPayrollJournal extends Document {
  payrollRun: mongoose.Types.ObjectId;
  referenceNumber: string;
  journalDate: Date;
  description?: string;
  entries: IPayrollJournalEntry[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  status: 'draft' | 'posted' | 'reversed';
  postedBy?: mongoose.Types.ObjectId;
  postedByName?: string;
  postedAt?: Date;
  branch?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  createdByName?: string;
  accountingPeriod?: string;
  costCenter?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PayrollJournalEntrySchema = new Schema<IPayrollJournalEntry>(
  {
    accountCode: { type: String, required: true },
    accountName: { type: String, required: true },
    description: { type: String, required: true },
    debit: { type: Number, required: true, min: 0, default: 0 },
    credit: { type: Number, required: true, min: 0, default: 0 },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  },
  { _id: false }
);

const PayrollJournalSchema = new Schema<IPayrollJournal>(
  {
    payrollRun: { type: Schema.Types.ObjectId, ref: 'PayrollRun', required: true },
    referenceNumber: { type: String, required: true, unique: true },
    journalDate: { type: Date, default: Date.now },
    description: { type: String },
    entries: [PayrollJournalEntrySchema],
    totalDebit: { type: Number, default: 0, min: 0 },
    totalCredit: { type: Number, default: 0, min: 0 },
    isBalanced: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['draft', 'posted', 'reversed'],
      default: 'draft',
    },
    postedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    postedByName: { type: String },
    postedAt: { type: Date },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdByName: { type: String },
    accountingPeriod: { type: String },
    costCenter: { type: String },
  },
  { timestamps: true }
);

PayrollJournalSchema.index({ referenceNumber: 1 });
PayrollJournalSchema.index({ payrollRun: 1 });
PayrollJournalSchema.index({ branch: 1 });
PayrollJournalSchema.index({ status: 1 });

const PayrollJournal: Model<IPayrollJournal> =
  mongoose.models.PayrollJournal || mongoose.model<IPayrollJournal>('PayrollJournal', PayrollJournalSchema);

export default PayrollJournal;
