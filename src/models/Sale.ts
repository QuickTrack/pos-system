import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISaleItem {
  product: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  barcode?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType?: 'percentage' | 'fixed';
  tax: number;
  total: number;
  costPrice?: number;
  variant?: {
    name: string;
    value: string;
  };
  // Unit information for multi-unit products
  unitName?: string;
  unitAbbreviation?: string;
  conversionToBase?: number;
  baseQuantity?: number;
}

export interface ISale extends Document {
  invoiceNumber: string;
  
  // Customer
  customer?: mongoose.Types.ObjectId;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  
  // Branch
  branch: mongoose.Types.ObjectId;
  
  // Cashier
  cashier: mongoose.Types.ObjectId;
  cashierName: string;
  
  // Items
  items: ISaleItem[];
  
  // Totals
  subtotal: number;
  discount: number;
  discountType?: 'percentage' | 'fixed';
  discountAmount: number;
  tax: number;
  taxRate: number;
  total: number;
  
  // Payment
  paymentMethod: 'cash' | 'mpesa' | 'card' | 'mixed' | 'credit' | 'account';
  chargedToAccount?: boolean;
  paymentDetails?: {
    amount: number;
    method: string;
    reference?: string;
    transactionId?: string;
  }[];
  amountPaid: number;
  change: number;
  
  // Status
  status: 'completed' | 'pending' | 'refunded' | 'voided';
  isRefund: boolean;
  refundedSale?: mongoose.Types.ObjectId;
  refundReason?: string;
  
  // M-Pesa
  mpesaReference?: string;
  mpesaPhone?: string;
  mpesaTransactionId?: string;
  
  // Profit
  profit: number;
  
  // Notes
  notes?: string;
  
  // Date
  saleDate: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const SaleItemSchema = new Schema<ISaleItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    barcode: { type: String },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    discountType: { type: String, enum: ['percentage', 'fixed'] },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
    costPrice: { type: Number },
    variant: {
      name: String,
      value: String,
    },
    // Unit information for multi-unit products
    unitName: { type: String },
    unitAbbreviation: { type: String },
    conversionToBase: { type: Number, default: 1 },
    baseQuantity: { type: Number },
  },
  { _id: false }
);

const SaleSchema = new Schema<ISale>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    
    // Customer
    customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String },
    customerPhone: { type: String },
    customerEmail: { type: String },
    customerAddress: { type: String },
    
    // Branch
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    
    // Cashier
    cashier: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    cashierName: { type: String, required: true },
    
    // Items
    items: [SaleItemSchema],
    
    // Totals
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    discountType: { type: String, enum: ['percentage', 'fixed'] },
    discountAmount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    taxRate: { type: Number, default: 16 }, // 16% VAT in Kenya
    total: { type: Number, required: true },
    
    // Payment
    paymentMethod: { 
      type: String, 
      enum: ['cash', 'mpesa', 'card', 'mixed', 'credit', 'account'], 
      required: true 
    },
    // Account payment - track if this was charged to customer account
    chargedToAccount: { type: Boolean, default: false },
    paymentDetails: [{
      amount: Number,
      method: String,
      reference: String,
      transactionId: String,
    }],
    amountPaid: { type: Number, required: true },
    change: { type: Number, default: 0 },
    
    // Status
    status: { 
      type: String, 
      enum: ['completed', 'pending', 'refunded', 'voided'], 
      default: 'completed' 
    },
    isRefund: { type: Boolean, default: false },
    refundedSale: { type: Schema.Types.ObjectId, ref: 'Sale' },
    refundReason: { type: String },
    
    // M-Pesa
    mpesaReference: { type: String },
    mpesaPhone: { type: String },
    mpesaTransactionId: { type: String },
    
    // Profit
    profit: { type: Number, default: 0 },
    
    // Notes
    notes: { type: String },
    
    // Date
    saleDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Index for reporting
SaleSchema.index({ saleDate: -1 });
SaleSchema.index({ branch: 1, saleDate: -1 });
SaleSchema.index({ customer: 1, saleDate: -1 });

const Sale: Model<ISale> = mongoose.models.Sale || mongoose.model<ISale>('Sale', SaleSchema);

export default Sale;
