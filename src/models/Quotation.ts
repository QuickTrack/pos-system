import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IQuotationItem {
  product?: mongoose.Types.ObjectId;
  productName: string;
  sku?: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  discountType?: 'percentage' | 'fixed';
  tax: number;
  taxType?: 'inclusive' | 'exclusive' | 'exempt';
  total: number;
  costPrice?: number;
  variant?: {
    name: string;
    value: string;
  };
}

export interface IQuotation extends Document {
  quotationNumber: string;
  
  status: 'draft' | 'pending_approval' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired' | 'converted' | 'cancelled';
  
  customer?: mongoose.Types.ObjectId;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  companyName?: string;
  kraPin?: string;
  deliveryAddress?: string;
  customerNotes?: string;
  
  quoteDate: Date;
  validUntil: Date;
  salesperson: mongoose.Types.ObjectId;
  salespersonName: string;
  branch: mongoose.Types.ObjectId;
  branchName: string;
  currency: string;
  
  items: IQuotationItem[];
  
  subtotal: number;
  discountTotal: number;
  vatTotal: number;
  shippingCharges: number;
  additionalCharges: number;
  additionalChargesDescription?: string;
  grandTotal: number;
  
  taxRate: number;
  taxInclusive: boolean;
  
  termsAndConditions?: string;
  notes?: string;
  
  preparedByName?: string;
  preparedBySignature?: string;
  preparedByDate?: Date;
  approvedByName?: string;
  approvedBySignature?: string;
  approvedByDate?: Date;
  customerSignature?: string;
  customerAcceptedDate?: Date;
  
  approvalRequired: boolean;
  approved: boolean;
  
  convertedFrom?: mongoose.Types.ObjectId;
  convertedTo?: mongoose.Types.ObjectId;
  convertedToType?: 'sales_order' | 'proforma_invoice' | 'invoice' | 'delivery_note' | 'pos_sale';
  convertedAt?: Date;
  
  sentAt?: Date;
  viewedAt?: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
  expiredAt?: Date;
  cancelledAt?: Date;
  
  pdfGenerated: boolean;
  pdfUrl?: string;
  
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const QuotationItemSchema = new Schema<IQuotationItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    productName: { type: String, required: true },
    sku: { type: String },
    description: { type: String },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    discountType: { type: String, enum: ['percentage', 'fixed'], default: 'fixed' },
    tax: { type: Number, default: 0, min: 0 },
    taxType: { type: String, enum: ['inclusive', 'exclusive', 'exempt'], default: 'exclusive' },
    total: { type: Number, required: true, min: 0 },
    costPrice: { type: Number },
    variant: {
      name: String,
      value: String,
    },
  },
  { _id: false }
);

const QuotationSchema = new Schema<IQuotation>(
  {
    quotationNumber: { type: String, required: true, unique: true },
    
    status: {
      type: String,
      enum: ['draft', 'pending_approval', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted', 'cancelled'],
      default: 'draft',
    },
    
    customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    customerEmail: { type: String },
    companyName: { type: String },
    kraPin: { type: String },
    deliveryAddress: { type: String },
    customerNotes: { type: String },
    
    quoteDate: { type: Date, default: Date.now },
    validUntil: { type: Date, required: true },
    salesperson: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    salespersonName: { type: String, required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    branchName: { type: String, required: true },
    currency: { type: String, default: 'KES' },
    
    items: [QuotationItemSchema],
    
    subtotal: { type: Number, default: 0 },
    discountTotal: { type: Number, default: 0 },
    vatTotal: { type: Number, default: 0 },
    shippingCharges: { type: Number, default: 0 },
    additionalCharges: { type: Number, default: 0 },
    additionalChargesDescription: { type: String },
    grandTotal: { type: Number, default: 0 },
    
    taxRate: { type: Number, default: 16 },
    taxInclusive: { type: Boolean, default: false },
    
    termsAndConditions: { type: String },
    notes: { type: String },
    
    preparedByName: { type: String },
    preparedBySignature: { type: String },
    preparedByDate: { type: Date },
    approvedByName: { type: String },
    approvedBySignature: { type: String },
    approvedByDate: { type: Date },
    customerSignature: { type: String },
    customerAcceptedDate: { type: Date },
    
    approvalRequired: { type: Boolean, default: false },
    approved: { type: Boolean, default: false },
    
    convertedFrom: { type: Schema.Types.ObjectId, ref: 'Quotation' },
    convertedTo: { type: Schema.Types.ObjectId },
    convertedToType: {
      type: String,
      enum: ['sales_order', 'proforma_invoice', 'invoice', 'delivery_note', 'pos_sale'],
    },
    convertedAt: { type: Date },
    
    sentAt: { type: Date },
    viewedAt: { type: Date },
    acceptedAt: { type: Date },
    rejectedAt: { type: Date },
    expiredAt: { type: Date },
    cancelledAt: { type: Date },
    
    pdfGenerated: { type: Boolean, default: false },
    pdfUrl: { type: String },
    
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

QuotationSchema.index({ quotationNumber: 1 });
QuotationSchema.index({ customer: 1, quoteDate: -1 });
QuotationSchema.index({ branch: 1, quoteDate: -1 });
QuotationSchema.index({ salesperson: 1, quoteDate: -1 });
QuotationSchema.index({ status: 1 });
QuotationSchema.index({ quoteDate: -1 });
QuotationSchema.index({ validUntil: 1 });

const Quotation: Model<IQuotation> = mongoose.models.Quotation || mongoose.model<IQuotation>('Quotation', QuotationSchema);

export default Quotation;
