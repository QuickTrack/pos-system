import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPayrollProfile extends Document {
  employeeNumber: string;
  employeeName: string;
  nationalId?: string;
  kraPin?: string;
  nssfNumber?: string;
  shifNumber?: string;
  bankName?: string;
  bankBranch?: string;
  bankAccountNumber?: string;
  mobileMoneyNumber?: string;
  email?: string;
  department?: string;
  position?: string;
  branch?: mongoose.Types.ObjectId;
  employmentType: 'permanent' | 'contract' | 'casual' | 'part_time' | 'intern' | 'consultant';
  contractType: 'full_time' | 'part_time';
  employmentDate?: Date;
  contractEndDate?: Date;
  probationEndDate?: Date;
  salaryStructure?: mongoose.Types.ObjectId;
  paymentFrequency: 'monthly' | 'weekly' | 'bi_weekly' | 'daily';
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  medicalAllowance: number;
  responsibilityAllowance: number;
  communicationAllowance: number;
  otherAllowances: number;
  workingHoursPerWeek: number;
  overtimeEligible: boolean;
  overtimeRateMultiplier: number;
  weeklyOffDays: string[];
  isActive: boolean;
  status: 'active' | 'inactive' | 'terminated' | 'on_leave';
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PayrollProfileSchema = new Schema<IPayrollProfile>(
  {
    employeeNumber: { type: String, required: true, unique: true },
    employeeName: { type: String, required: true },
    nationalId: { type: String },
    kraPin: { type: String },
    nssfNumber: { type: String },
    shifNumber: { type: String },
    bankName: { type: String },
    bankBranch: { type: String },
    bankAccountNumber: { type: String },
    mobileMoneyNumber: { type: String },
    email: { type: String },
    department: { type: String },
    position: { type: String },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    employmentType: {
      type: String,
      enum: ['permanent', 'contract', 'casual', 'part_time', 'intern', 'consultant'],
      required: true,
    },
    contractType: {
      type: String,
      enum: ['full_time', 'part_time'],
      default: 'full_time',
    },
    employmentDate: { type: Date },
    contractEndDate: { type: Date },
    probationEndDate: { type: Date },
    salaryStructure: { type: Schema.Types.ObjectId, ref: 'SalaryStructure' },
    paymentFrequency: {
      type: String,
      enum: ['monthly', 'weekly', 'bi_weekly', 'daily'],
      required: true,
    },
    basicSalary: { type: Number, required: true, min: 0, default: 0 },
    housingAllowance: { type: Number, default: 0, min: 0 },
    transportAllowance: { type: Number, default: 0, min: 0 },
    medicalAllowance: { type: Number, default: 0, min: 0 },
    responsibilityAllowance: { type: Number, default: 0, min: 0 },
    communicationAllowance: { type: Number, default: 0, min: 0 },
    otherAllowances: { type: Number, default: 0, min: 0 },
    workingHoursPerWeek: { type: Number, default: 40, min: 0 },
    overtimeEligible: { type: Boolean, default: false },
    overtimeRateMultiplier: { type: Number, default: 1.5, min: 0 },
    weeklyOffDays: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['active', 'inactive', 'terminated', 'on_leave'],
      default: 'active',
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

PayrollProfileSchema.index({ employeeNumber: 1 });
PayrollProfileSchema.index({ branch: 1 });
PayrollProfileSchema.index({ department: 1 });
PayrollProfileSchema.index({ status: 1 });
PayrollProfileSchema.index({ salaryStructure: 1 });

const PayrollProfile: Model<IPayrollProfile> =
  mongoose.models.PayrollProfile || mongoose.model<IPayrollProfile>('PayrollProfile', PayrollProfileSchema);

export default PayrollProfile;
