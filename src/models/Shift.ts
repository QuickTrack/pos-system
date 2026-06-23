import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IShift extends Document {
  shiftId: string;
  cashier: mongoose.Types.ObjectId;
  cashierName: string;
  register: mongoose.Types.ObjectId;
  registerNumber: string;
  branch: mongoose.Types.ObjectId;
  openingFloat: number;
  closingFloat: number;
  expectedCash: number;
  actualCash: number;
  variance: number;
  status: 'open' | 'closed' | 'suspended';
  startTime: Date;
  endTime: Date;
  closingCashCount: number;
  closingNotes: string;
  supervisorVerified: boolean;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedByName?: string;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ShiftSchema = new Schema<IShift>(
  {
    shiftId: { type: String, required: true, unique: true },
    cashier: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    cashierName: { type: String, required: true },
    register: { type: Schema.Types.ObjectId, ref: 'Register', required: true },
    registerNumber: { type: String, required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    openingFloat: { type: Number, required: true, min: 0 },
    closingFloat: { type: Number, default: 0 },
    expectedCash: { type: Number, default: 0 },
    actualCash: { type: Number, default: 0 },
    variance: { type: Number, default: 0 },
    status: { type: String, enum: ['open', 'closed', 'suspended'], default: 'open' },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    closingCashCount: { type: Number },
    closingNotes: { type: String },
    supervisorVerified: { type: Boolean, default: false },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedByName: { type: String },
    verifiedAt: { type: Date },
  },
  { timestamps: true }
);

ShiftSchema.index({ shiftId: 1 });
ShiftSchema.index({ cashier: 1, status: 1 });
ShiftSchema.index({ register: 1, status: 1 });
ShiftSchema.index({ branch: 1, status: 1 });
ShiftSchema.index({ createdAt: -1 });

const Shift: Model<IShift> = mongoose.models.Shift || mongoose.model<IShift>('Shift', ShiftSchema);

export default Shift;
