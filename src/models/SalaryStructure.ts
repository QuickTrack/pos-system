import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISalaryStructure extends Document {
  name: string;
  description?: string;
  category: 'executive' | 'senior_management' | 'middle_management' | 'supervisory' | 'staff' | 'casual' | 'monthly_salary' | 'weekly_salary' | 'daily_wage' | 'hourly_rate' | 'commission_based' | 'piece_rate';
  paymentFrequency: 'monthly' | 'weekly' | 'bi_weekly' | 'daily' | 'hourly';
  amount: number;
  rate: number;
  currency: string;
  workingHoursPerWeek: number;
  workingDaysPerWeek: number;
  overtimeMultiplierNormal: number;
  overtimeMultiplierWeekend: number;
  overtimeMultiplierHoliday: number;
  maxOvertimeHoursPerWeek: number;
  includes: string[];
  isDefault: boolean;
  isActive: boolean;
  branch?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SalaryStructureSchema = new Schema<ISalaryStructure>(
  {
    name: { type: String, required: true },
    description: { type: String },
    category: {
      type: String,
      enum: ['executive', 'senior_management', 'middle_management', 'supervisory', 'staff', 'casual', 'monthly_salary', 'weekly_salary', 'daily_wage', 'hourly_rate', 'commission_based', 'piece_rate'],
      required: true,
    },
    paymentFrequency: {
      type: String,
      enum: ['monthly', 'weekly', 'bi_weekly', 'daily', 'hourly'],
      required: true,
    },
    amount: { type: Number, required: true, min: 0, default: 0 },
    rate: { type: Number, min: 0, default: 0 },
    currency: { type: String, default: 'KES' },
    workingHoursPerWeek: { type: Number, default: 40, min: 0 },
    workingDaysPerWeek: { type: Number, default: 5, min: 0 },
    overtimeMultiplierNormal: { type: Number, default: 1.5, min: 0 },
    overtimeMultiplierWeekend: { type: Number, default: 1.5, min: 0 },
    overtimeMultiplierHoliday: { type: Number, default: 2, min: 0 },
    maxOvertimeHoursPerWeek: { type: Number, default: 20, min: 0 },
    includes: {
      type: [String],
      enum: ['nssf', 'shif', 'housing_levy', 'paye', 'medical_cover', 'pension'],
      default: [],
    },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

SalaryStructureSchema.index({ name: 1 });
SalaryStructureSchema.index({ branch: 1 });
SalaryStructureSchema.index({ category: 1 });
SalaryStructureSchema.index({ isDefault: 1 });

const SalaryStructure: Model<ISalaryStructure> =
  mongoose.models.SalaryStructure || mongoose.model<ISalaryStructure>('SalaryStructure', SalaryStructureSchema);

export default SalaryStructure;
