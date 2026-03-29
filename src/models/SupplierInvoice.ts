import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISupplierInvoiceItem {
  product: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  quantity: number;
  unitCost: number;
  discount: number;
  tax: number;
  total: number;
  // Unit info for stock conversion
  unitName?: string;
  unitAbbreviation?: string;
  conversionToBase?: number;
  // Batch tracking
  batchNumber?: string;
  expiryDate?: Date;
}

export interface ISupplierInvoicePayment {
  amount: number;
  paymentDate: Date;
  paymentMethod: 'cash' | 'bank_transfer' | 'mpesa' | 'cheque' | 'card';
  referenceNumber?: string;
  notes?: string;
  recordedBy?: mongoose.Types.ObjectId;
  recordedByName?: string;
}

export interface ISupplierInvoice extends Document {
  invoiceNumber: string;
  supplier: mongoose.Types.ObjectId;
  supplierName: string;
  purchaseOrder?: mongoose.Types.ObjectId;
  purchaseOrderNumber?: string;
  
  // Items
  items: ISupplierInvoiceItem[];
  
  // Totals
  subtotal: number;
  discount: number;
  discountAmount: number;
  tax: number;
  total: number;
  amountPaid: number;
  balance: number;
  
  // Status
  status: 'draft' | 'pending_approval' | 'approved' | 'partially_paid' | 'paid' | 'overdue' | 'unpaid';
  
  // Dates
  invoiceDate: Date;
  dueDate: Date;
  approvedDate?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  approvedByName?: string;
  
  // Payments
  payments: ISupplierInvoicePayment[];
  
  // Notes
  notes?: string;
  
  // Branch
  branch?: mongoose.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

const SupplierInvoiceItemSchema = new Schema<ISupplierInvoiceItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    sku: { type: String, required: false },
    quantity: { type: Number, required: true },
    unitCost: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
    // Unit info for stock conversion
    unitName: { type: String },
    unitAbbreviation: { type: String },
    conversionToBase: { type: Number, default: 1 },
    // Batch tracking
    batchNumber: { type: String },
    expiryDate: { type: Date },
  },
  { _id: false }
);

const SupplierInvoicePaymentSchema = new Schema<ISupplierInvoicePayment>(
  {
    amount: { type: Number, required: true },
    paymentDate: { type: Date, required: true },
    paymentMethod: { 
      type: String, 
      enum: ['cash', 'bank_transfer', 'mpesa', 'cheque', 'card'],
      required: true 
    },
    referenceNumber: { type: String },
    notes: { type: String },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    recordedByName: { type: String },
  },
  { _id: false }
);

const SupplierInvoiceSchema = new Schema<ISupplierInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    supplierName: { type: String, required: true },
    purchaseOrder: { type: Schema.Types.ObjectId, ref: 'Purchase' },
    purchaseOrderNumber: { type: String },
    
    // Items
    items: [SupplierInvoiceItemSchema],
    
    // Totals
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    
    // Status
    status: { 
      type: String, 
      enum: ['draft', 'pending_approval', 'approved', 'partially_paid', 'paid', 'overdue', 'unpaid'],
      default: 'unpaid' 
    },
    
    // Dates
    invoiceDate: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },
    approvedDate: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedByName: { type: String },
    
    // Payments
    payments: [SupplierInvoicePaymentSchema],
    
    // Notes
    notes: { type: String },
    
    // Branch
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
  },
  { timestamps: true }
);

// Indexes for reporting
SupplierInvoiceSchema.index({ invoiceDate: -1 });
SupplierInvoiceSchema.index({ supplier: 1, invoiceDate: -1 });
SupplierInvoiceSchema.index({ dueDate: 1 });
SupplierInvoiceSchema.index({ status: 1 });
SupplierInvoiceSchema.index({ branch: 1, invoiceDate: -1 });



const SupplierInvoice: Model<ISupplierInvoice> = mongoose.models.SupplierInvoice || mongoose.model<ISupplierInvoice>('SupplierInvoice', SupplierInvoiceSchema);

export default SupplierInvoice;
