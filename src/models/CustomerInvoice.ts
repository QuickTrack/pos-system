import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IInvoiceItem {
  product: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType?: 'percentage' | 'fixed';
  tax: number;
  total: number;
}

export interface IInvoicePayment {
  amount: number;
  date: Date;
  method: 'cash' | 'mpesa' | 'bank' | 'cheque' | 'other';
  reference?: string;
  notes?: string;
  recordedBy: mongoose.Types.ObjectId;
}

export interface ICustomerInvoice extends Document {
  invoiceNumber: string;
  
  // Customer
  customer: mongoose.Types.ObjectId;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerKraPin?: string;
  
  // Credit terms
  creditLimit: number;
  paymentTerms: number; // days
  dueDate: Date;
  
  // Items
  items: IInvoiceItem[];
  
  // Totals
  subtotal: number;
  discount: number;
  discountType?: 'percentage' | 'fixed';
  discountAmount: number;
  tax: number;
  taxRate: number;
  total: number;
  
  // Status
  status: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  
  // Payments
  payments: IInvoicePayment[];
  amountPaid: number;
  balanceDue: number;
  
  // Notes
  notes?: string;
  terms?: string;
  
  // Branch
  branch: mongoose.Types.ObjectId;
  
  // Created by
  createdBy: mongoose.Types.ObjectId;
  createdByName: string;
  
  // Dates
  invoiceDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  discountType: { type: String, enum: ['percentage', 'fixed'] },
  tax: { type: Number, default: 0 },
  total: { type: Number, required: true },
}, { _id: false });

const InvoicePaymentSchema = new Schema<IInvoicePayment>({
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  method: { 
    type: String, 
    enum: ['cash', 'mpesa', 'bank', 'cheque', 'other'],
    required: true 
  },
  reference: { type: String },
  notes: { type: String },
  recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { _id: true });

const CustomerInvoiceSchema = new Schema<ICustomerInvoice>({
  invoiceNumber: { type: String, required: true, unique: true },
  
  // Customer
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String },
  customerAddress: { type: String },
  customerKraPin: { type: String },
  
  // Credit terms
  creditLimit: { type: Number, default: 0 },
  paymentTerms: { type: Number, default: 30 },
  dueDate: { type: Date, required: true },
  
  // Items
  items: [InvoiceItemSchema],
  
  // Totals
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  discountType: { type: String, enum: ['percentage', 'fixed'] },
  discountAmount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  taxRate: { type: Number, default: 16 },
  total: { type: Number, required: true },
  
  // Status
  status: { 
    type: String, 
    enum: ['draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled'],
    default: 'draft'
  },
  
  // Payments
  payments: [InvoicePaymentSchema],
  amountPaid: { type: Number, default: 0 },
  balanceDue: { type: Number, required: true },
  
  // Notes
  notes: { type: String },
  terms: { type: String },
  
  // Branch
  branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  
  // Created by
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdByName: { type: String, required: true },
  
  // Dates
  invoiceDate: { type: Date, default: Date.now },
}, { timestamps: true });

// Index for querying
CustomerInvoiceSchema.index({ customer: 1, status: 1 });
CustomerInvoiceSchema.index({ dueDate: 1, status: 1 });
CustomerInvoiceSchema.index({ invoiceDate: -1 });

const CustomerInvoice: Model<ICustomerInvoice> = mongoose.models.CustomerInvoice || mongoose.model<ICustomerInvoice>('CustomerInvoice', CustomerInvoiceSchema);

export default CustomerInvoice;
