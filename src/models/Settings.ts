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
  paymentTill?: string;
  sendMoneyPhoneNumber?: string;
  acceptedPaymentMethods?: string;
  
  // Logo
  logo?: string;
  receiptLogo?: string;
  
  // Tax Settings
  taxRate: number;
  taxName: string;
  enableTax: boolean;
  includeInPrice: boolean;
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
  
  // Cash Sale Settings
  cashSalePrefix: string;
  cashSaleNumber: number;
  
  // Financial Year Settings
  financialYearStartMonth: number; // 1-12
  financialYearEndMonth: number; // 1-12
  currentFinancialYear: string; // e.g., "2025-2026"
  fiscalYearStartDate: Date;
  
  // Invoice numbering per financial year
  invoiceNumbersByYear: { [year: string]: number }; // e.g., { "2025-2026": 100 }
  cashSaleNumbersByYear: { [year: string]: number }; // e.g., { "2025-2026": 50 }
  lastYearTransitionDate: Date;
  
  // Sale Settings
  defaultPaymentMethod: 'cash' | 'mpesa' | 'card';
  requireCustomerForSale: boolean;
  allowNegativeStock: boolean;
  lowStockAlert: boolean;
  
  // Branch
  branch?: mongoose.Types.ObjectId;
  
  // Multi-branch settings
  allowMultiBranch: boolean;
  
  // Payroll Settings
  payrollEnabled: boolean;
  payrollPrefix: string;
  payrollNumber: number;
  payrollNumbersByYear: { [year: string]: number };
  defaultPayrollDay: number;
  overtimeMultiplier: number;
  weekendOvertimeMultiplier: number;
  holidayOvertimeMultiplier: number;
  maxOvertimeHours: number;
  defaultPaymentFrequency: string;
  autoProcessPayroll: boolean;
  payrollApprovalRequired: boolean;
  payslipTemplate: string;
  salaryAdvanceLimit: number;
  salaryAdvanceInterestRate: number;
  loanInterestRate: number;
  nssfRate: number;
  shifRate: number;
  housingLevyRate: number;
  payeRates: { min: number; max: number; rate: number; fixed: number }[];
  nssfPensionablePayMax: number;
  shifPensionablePayMax: number;
  housingLevyIncomeMax: number;
  
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
    paymentTill: { type: String },
    sendMoneyPhoneNumber: { type: String },
    acceptedPaymentMethods: { type: String },
    
    // Logo
    logo: { type: String },
    receiptLogo: { type: String },
    
    // Tax Settings
    taxRate: { type: Number, default: 16 }, // 16% VAT in Kenya
    taxName: { type: String, default: 'VAT' },
    enableTax: { type: Boolean, default: true },
    includeInPrice: { type: Boolean, default: false },
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
    
    // Cash Sale Settings
    cashSalePrefix: { type: String, default: 'CSH' },
    cashSaleNumber: { type: Number, default: 1 },
    
    // Financial Year Settings
    financialYearStartMonth: { type: Number, default: 7 }, // July (7) - typical for Kenya
    financialYearEndMonth: { type: Number, default: 6 }, // June (6)
    currentFinancialYear: { type: String, default: '2025-2026' },
    fiscalYearStartDate: { type: Date, default: () => new Date(new Date().getFullYear(), 6, 1) }, // July 1st
    
    // Invoice numbering per financial year
    invoiceNumbersByYear: { type: Map, of: Number, default: {} },
    cashSaleNumbersByYear: { type: Map, of: Number, default: {} },
    lastYearTransitionDate: { type: Date, default: null },
    
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
    
    // Payroll Settings
    payrollEnabled: { type: Boolean, default: false },
    payrollPrefix: { type: String, default: 'PAY' },
    payrollNumber: { type: Number, default: 1 },
    payrollNumbersByYear: { type: Map, of: Number, default: {} },
    defaultPayrollDay: { type: Number, default: 25, min: 1, max: 31 },
    overtimeMultiplier: { type: Number, default: 1.5 },
    weekendOvertimeMultiplier: { type: Number, default: 2.0 },
    holidayOvertimeMultiplier: { type: Number, default: 2.5 },
    maxOvertimeHours: { type: Number, default: 40 },
    defaultPaymentFrequency: { type: String, default: 'monthly' },
    autoProcessPayroll: { type: Boolean, default: false },
    payrollApprovalRequired: { type: Boolean, default: true },
    payslipTemplate: { type: String, default: 'standard' },
    salaryAdvanceLimit: { type: Number, default: 50000 },
    salaryAdvanceInterestRate: { type: Number, default: 0 },
    loanInterestRate: { type: Number, default: 5 },
    nssfRate: { type: Number, default: 6 }, // 6% employee
    shifRate: { type: Number, default: 2.75 },
    housingLevyRate: { type: Number, default: 1.5 },
    payeRates: { type: Schema.Types.Mixed, default: [
      { min: 0, max: 24000, rate: 10, fixed: 0 },
      { min: 24001, max: 32333, rate: 25, fixed: 2400 },
      { min: 32334, max: 500000, rate: 30, fixed: 5258.33 },
      { min: 500001, max: 800000, rate: 32.5, fixed: 122650 },
      { min: 800001, max: Infinity, rate: 35, fixed: 265475 },
    ]},
    nssfPensionablePayMax: { type: Number, default: 72000 },
    shifPensionablePayMax: { type: Number, default: null },
    housingLevyIncomeMax: { type: Number, default: null },
  },
  { timestamps: true }
);

const Settings: Model<ISettings> = mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);

export default Settings;
