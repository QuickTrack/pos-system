import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICashDrop extends Document {
  dropId: string;
  shift: mongoose.Types.ObjectId;
  cashier: mongoose.Types.ObjectId;
  cashierName: string;
  branch: mongoose.Types.ObjectId;
  registerNumber: string;
  amount: number;
  reason: 'safe_deposit' | 'bank_deposit' | 'security' | 'float_transfer' | 'other';
  authorizedBy: mongoose.Types.ObjectId;
  authorizedByName: string;
  notes: string;
  receiptGenerated: boolean;
  dropTime: Date;
  createdAt: Date;
}

const CashDropSchema = new Schema<ICashDrop>(
  {
    dropId: { type: String, required: true, unique: true },
    shift: { type: Schema.Types.ObjectId, ref: 'Shift', required: true },
    cashier: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    cashierName: { type: String, required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    registerNumber: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    reason: {
      type: String,
      enum: ['safe_deposit', 'bank_deposit', 'security', 'float_transfer', 'other'],
      required: true,
    },
    authorizedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorizedByName: { type: String, required: true },
    notes: { type: String },
    receiptGenerated: { type: Boolean, default: false },
    dropTime: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

CashDropSchema.index({ dropId: 1 });
CashDropSchema.index({ shift: 1, dropTime: -1 });
CashDropSchema.index({ branch: 1, dropTime: -1 });
CashDropSchema.index({ cashier: 1, dropTime: -1 });

const CashDrop: Model<ICashDrop> = mongoose.models.CashDrop || mongoose.model<ICashDrop>('CashDrop', CashDropSchema);

export default CashDrop;
