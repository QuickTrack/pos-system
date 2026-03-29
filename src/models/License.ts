import mongoose, { Schema, Document } from 'mongoose';

export interface ILicense extends Document {
  licenseKey: string;
  businessName: string;
  email: string;
  phone?: string;
  address?: string;
  taxNumber?: string;
  industry?: string;
  contactPerson?: string;
  activationDate?: Date;
  expirationDate: Date;
  status: 'active' | 'expired' | 'suspended';
  licenseType: 'trial' | 'annual' | 'lifetime';
  maxUsers: number;
  maxBranches: number;
  features: string[];
  activatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  renewalHistory: {
    date: Date;
    previousExpiration: Date;
    newExpiration: Date;
    renewalKey: string;
  }[];
  regenerationHistory: {
    date: Date;
    previousKey: string;
    newKey: string;
    reason?: string;
    performedBy: string;
    expirationDate?: Date;
    features?: string[];
    maxUsers?: number;
    maxBranches?: number;
  }[];
  previousLicenseKey?: string;
  regeneratedAt?: Date;
  regeneratedBy?: string;
}

const LicenseSchema = new Schema<ILicense>(
  {
    licenseKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    businessName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
    },
    address: {
      type: String,
    },
    taxNumber: {
      type: String,
      description: 'Business registration or tax identification number',
    },
    industry: {
      type: String,
    },
    contactPerson: {
      type: String,
      description: 'Primary contact person for the business',
    },
    activationDate: {
      type: Date,
    },
    expirationDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'suspended'],
      default: 'active',
    },
    licenseType: {
      type: String,
      enum: ['trial', 'annual', 'lifetime'],
      default: 'annual',
    },
    maxUsers: {
      type: Number,
      default: 10,
    },
    maxBranches: {
      type: Number,
      default: 5,
    },
    features: {
      type: [String],
      default: ['pos', 'inventory', 'customers', 'suppliers', 'reports'],
    },
    activatedBy: {
      type: String,
    },
    renewalHistory: [
      {
        date: Date,
        previousExpiration: Date,
        newExpiration: Date,
        renewalKey: String,
      },
    ],
    regenerationHistory: [
      {
        date: Date,
        previousKey: String,
        newKey: String,
        reason: String,
        performedBy: String,
        expirationDate: Date,
        features: [String],
        maxUsers: Number,
        maxBranches: Number,
      },
    ],
    previousLicenseKey: {
      type: String,
    },
    regeneratedAt: {
      type: Date,
    },
    regeneratedBy: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient status checks
LicenseSchema.index({ status: 1, expirationDate: 1 });
// Index for finding trial by email
LicenseSchema.index({ email: 1, licenseType: 1 });

// Virtual for checking if license is valid
LicenseSchema.virtual('isValid').get(function () {
  if (this.status === 'suspended') return false;
  if (this.licenseType === 'lifetime') return true;
  return new Date() < this.expirationDate;
});

// Virtual for days remaining
LicenseSchema.virtual('daysRemaining').get(function () {
  if (this.licenseType === 'lifetime') return Infinity;
  const now = new Date();
  const diff = this.expirationDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

LicenseSchema.set('toJSON', { virtuals: true });
LicenseSchema.set('toObject', { virtuals: true });

const License = mongoose.models.License || mongoose.model<ILicense>('License', LicenseSchema);

export default License;
