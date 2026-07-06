import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEarning extends Document {
  name: string;
  description?: string;
  code: string;
  category: 'fixed' | 'variable' | 'overtime' | 'commission' | 'bonus' | 'leave_pay' | 'holiday_pay' | 'night_shift' | 'allowance';
  type: 'percentage' | 'fixed_amount' | 'formula' | 'formula_based';
  percentageOf?: 'basic_salary' | 'gross_salary';
  fixedAmount?: number;
  formula?: string;
  isPercentage: boolean;
  rate?: number;
  isTaxable: boolean;
  isPensionable: boolean;
  isActive: boolean;
  appliesToEmploymentTypes: string[];
  branch?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EarningSchema = new Schema<IEarning>(
  {
    name: { type: String, required: true },
    description: { type: String },
    code: { type: String, required: true, unique: true },
    category: {
      type: String,
      enum: ['fixed', 'variable', 'overtime', 'commission', 'bonus', 'leave_pay', 'holiday_pay', 'night_shift', 'allowance'],
      required: true,
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed_amount', 'formula', 'formula_based'],
      required: true,
    },
    percentageOf: {
      type: String,
      enum: ['basic_salary', 'gross_salary'],
    },
    fixedAmount: { type: Number, min: 0 },
    formula: { type: String },
    isPercentage: { type: Boolean, default: false },
    rate: { type: Number, min: 0 },
    isTaxable: { type: Boolean, default: true },
    isPensionable: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    appliesToEmploymentTypes: {
      type: [String],
      enum: ['permanent', 'contract', 'casual', 'part_time', 'intern', 'consultant'],
      default: [],
    },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

EarningSchema.index({ code: 1 });
EarningSchema.index({ branch: 1 });
EarningSchema.index({ category: 1 });
EarningSchema.index({ isActive: 1 });

const Earning: Model<IEarning> =
  mongoose.models.Earning || mongoose.model<IEarning>('Earning', EarningSchema);

export default Earning;
