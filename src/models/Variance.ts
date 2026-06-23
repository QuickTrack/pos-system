import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVariance extends Document {
  varianceId: string;
  shift: mongoose.Types.ObjectId;
  branch: mongoose.Types.ObjectId;
  registerNumber: string;
  type: 'shortage' | 'overage';
  amount: number;
  explanation: string;
  approvedBy: mongoose.Types.ObjectId;
  approvedByName: string;
  status: 'pending' | 'approved' | 'rejected';
  notes: string;
  createdAt: Date;
}

const VarianceSchema = new Schema<IVariance>(
  {
    varianceId: { type: String, required: true, unique: true },
    shift: { type: Schema.Types.ObjectId, ref: 'Shift', required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    registerNumber: { type: String, required: true },
    type: { type: String, enum: ['shortage', 'overage'], required: true },
    amount: { type: Number, required: true, min: 0 },
    explanation: { type: String, required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedByName: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    notes: { type: String },
  },
  { timestamps: true }
);

VarianceSchema.index({ varianceId: 1 });
VarianceSchema.index({ shift: 1 });
VarianceSchema.index({ branch: 1, createdAt: -1 });
VarianceSchema.index({ status: 1, createdAt: -1 });

const Variance: Model<IVariance> = mongoose.models.Variance || mongoose.model<IVariance>('Variance', VarianceSchema);

export default Variance;
