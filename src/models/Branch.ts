import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBranch extends Document {
  name: string;
  code: string;
  address: string;
  phone: string;
  email?: string;
  isActive: boolean;
  isMain: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BranchSchema = new Schema<IBranch>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    isActive: { type: Boolean, default: true },
    isMain: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Branch: Model<IBranch> = mongoose.models.Branch || mongoose.model<IBranch>('Branch', BranchSchema);

export default Branch;
