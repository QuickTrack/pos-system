import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'super_admin' | 'admin' | 'manager' | 'cashier' | 'stock_manager';

export interface IPermission {
  sales: boolean;
  refunds: boolean;
  inventory: boolean;
  purchases: boolean;
  suppliers: boolean;
  reports: boolean;
  customers: boolean;
  discounts: boolean;
  settings: boolean;
  users: boolean;
  branches: boolean;
}

export interface IUser extends Document {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  permissions?: IPermission;
  branch?: mongoose.Types.ObjectId;
  profilePhoto?: string;
  isActive: boolean;
  isLocked: boolean;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  lastLogin?: Date;
  pin?: string;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  createdBy?: mongoose.Types.ObjectId;
  comparePassword(candidatePassword: string): Promise<boolean>;
  comparePin(candidatePin: string): Promise<boolean>;
}

const PermissionSchema = new Schema<IPermission>(
  {
    sales: { type: Boolean, default: true },
    refunds: { type: Boolean, default: false },
    inventory: { type: Boolean, default: false },
    purchases: { type: Boolean, default: false },
    suppliers: { type: Boolean, default: false },
    reports: { type: Boolean, default: false },
    customers: { type: Boolean, default: false },
    discounts: { type: Boolean, default: false },
    settings: { type: Boolean, default: false },
    users: { type: Boolean, default: false },
    branches: { type: Boolean, default: false },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    role: { 
      type: String, 
      enum: ['super_admin', 'admin', 'manager', 'cashier', 'stock_manager'], 
      default: 'cashier' 
    },
    permissions: { type: PermissionSchema },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    profilePhoto: { type: String },
    isActive: { type: Boolean, default: true },
    isLocked: { type: Boolean, default: false },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
    lastLogin: { type: Date },
    pin: { type: String },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 });
UserSchema.index({ phone: 1 });
UserSchema.index({ branch: 1 });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.comparePin = async function (candidatePin: string): Promise<boolean> {
  if (!this.pin) return false;
  return bcrypt.compare(candidatePin, this.pin);
};

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
