import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISettings extends Document {
  // Business Info
  businessName: string;
  businessTagline?: string;
  phone: string;
  email?: string;
  address?: string;
  kraPin?: string;
  website?: string;
  
  // Bank Details
  bankName?: string;
  bankAccount?: string;
  bankBranch?: string;
  
  // Logo
  logo?: string;
  receiptLogo?: string;
  
  // Tax Settings
  taxRate: number;
  taxName: string;
  enableTax: boolean;
  vatNumber?: string;
  
  // Receipt Settings
  receiptHeader?: string;
  receiptFooter?: string;
  showLogoOnReceipt: boolean;
  receiptPrinter?: string;
  
  // M-Pesa Settings
  mpesaEnabled: boolean;
  mpesaShortCode?: string;
  mpesaPasskey?: string;
  mpesaConsumerKey?: string;
  mpesaConsumerSecret?: string;
  mpesaEnvironment?: 'sandbox' | 'production';
  
  // Invoice Settings
  invoicePrefix: string;
  invoiceNumber: number;
  invoiceTerms?: string;
  
  // Sale Settings
  defaultPaymentMethod: 'cash' | 'mpesa' | 'card';
  requireCustomerForSale: boolean;
  allowNegativeStock: boolean;
  lowStockAlert: boolean;
  
  // Branch
  branch?: mongoose.Types.ObjectId;
  
  // Multi-branch settings
  allowMultiBranch: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    // Business Info
    businessName: { type: String, default: 'My Shop' },
    businessTagline: { type: String },
    phone: { type: String, default: '' },
    email: { type: String },
    address: { type: String },
    kraPin: { type: String },
    website: { type: String },
    
    // Bank Details
    bankName: { type: String },
    bankAccount: { type: String },
    bankBranch: { type: String },
    
    // Logo
    logo: { type: String },
    receiptLogo: { type: String },
    
    // Tax Settings
    taxRate: { type: Number, default: 16 }, // 16% VAT in Kenya
    taxName: { type: String, default: 'VAT' },
    enableTax: { type: Boolean, default: true },
    vatNumber: { type: String },
    
    // Receipt Settings
    receiptHeader: { type: String },
    receiptFooter: { type: String, default: 'Thank you for shopping with us!' },
    showLogoOnReceipt: { type: Boolean, default: true },
    receiptPrinter: { type: String },
    
    // M-Pesa Settings
    mpesaEnabled: { type: Boolean, default: false },
    mpesaShortCode: { type: String },
    mpesaPasskey: { type: String },
    mpesaConsumerKey: { type: String },
    mpesaConsumerSecret: { type: String },
    mpesaEnvironment: { 
      type: String, 
      enum: ['sandbox', 'production'], 
      default: 'sandbox' 
    },
    
    // Invoice Settings
    invoicePrefix: { type: String, default: 'INV' },
    invoiceNumber: { type: Number, default: 1 },
    invoiceTerms: { type: String },
    
    // Sale Settings
    defaultPaymentMethod: { 
      type: String, 
      enum: ['cash', 'mpesa', 'card'], 
      default: 'cash' 
    },
    requireCustomerForSale: { type: Boolean, default: false },
    allowNegativeStock: { type: Boolean, default: false },
    lowStockAlert: { type: Boolean, default: true },
    
    // Branch
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    
    // Multi-branch settings
    allowMultiBranch: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Settings: Model<ISettings> = mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);

export default Settings;
