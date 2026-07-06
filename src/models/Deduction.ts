import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITieredRate {
  min: number;
  max: number;
  rate: number;
  amount: number;
}

export interface IDeduction extends Document {
  name: string;
  description?: string;
  code: string;
  category: 'statutory' | 'company' | 'voluntary' | 'loan' | 'advance' | 'cooperative' | 'pension' | 'insurance' | 'union';
  type: 'fixed_amount' | 'percentage' | 'formula' | 'tiered';
  fixedAmount?: number;
  percentageOf?: 'basic_salary' | 'gross_salary';
  formula?: string;
  tieredRates: ITieredRate[];
  isPreTax: boolean;
  isTaxable: boolean;
  isActive: boolean;
  appliesToEmploymentTypes: string[];
  statutoryType?: 'paye' | 'nssf' | 'shif' | 'housing_levy';
  branch?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

const TieredRateSchema = new Schema<ITieredRate>(
  {
    min: { type: Number, required: true, min: 0 },
    max: { type: Number, required: true },
    rate: { type: Number, required: true, min: 0 },
    amount: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const DeductionSchema = new Schema<IDeduction>(
  {
    name: { type: String, required: true },
    description: { type: String },
    code: { type: String, required: true, unique: true },
    category: {
      type: String,
      enum: ['statutory', 'company', 'voluntary', 'loan', 'advance', 'cooperative', 'pension', 'insurance', 'union'],
      required: true,
    },
    type: {
      type: String,
      enum: ['fixed_amount', 'percentage', 'formula', 'tiered'],
      required: true,
    },
    fixedAmount: { type: Number, min: 0 },
    percentageOf: {
      type: String,
      enum: ['basic_salary', 'gross_salary'],
    },
    formula: { type: String },
    tieredRates: [TieredRateSchema],
    isPreTax: { type: Boolean, default: false },
    isTaxable: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    appliesToEmploymentTypes: {
      type: [String],
      enum: ['permanent', 'contract', 'casual', 'part_time', 'intern', 'consultant'],
      default: [],
    },
    statutoryType: {
      type: String,
      enum: ['paye', 'nssf', 'shif', 'housing_levy'],
    },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    priority: { type: Number, default: 0 },
  },
  { timestamps: true }
);

DeductionSchema.index({ code: 1 });
DeductionSchema.index({ branch: 1 });
DeductionSchema.index({ category: 1 });
DeductionSchema.index({ statutoryType: 1 });
DeductionSchema.index({ isActive: 1 });

const Deduction: Model<IDeduction> =
  mongoose.models.Deduction || mongoose.model<IDeduction>('Deduction', DeductionSchema);

export default Deduction;
