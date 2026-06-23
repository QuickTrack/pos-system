import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRegister extends Document {
  registerNumber: string;
  name: string;
  branch: mongoose.Types.ObjectId;
  status: 'active' | 'inactive';
  currentShift: mongoose.Types.ObjectId;
  isOpen: boolean;
  balance: number;
  lastZRead: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RegisterSchema = new Schema<IRegister>(
  {
    registerNumber: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    currentShift: { type: Schema.Types.ObjectId, ref: 'Shift' },
    isOpen: { type: Boolean, default: false },
    balance: { type: Number, default: 0 },
    lastZRead: { type: Date },
  },
  { timestamps: true }
);

RegisterSchema.index({ registerNumber: 1 });
RegisterSchema.index({ branch: 1 });
RegisterSchema.index({ isOpen: 1 });

const Register: Model<IRegister> = mongoose.models.Register || mongoose.model<IRegister>('Register', RegisterSchema);

export default Register;
