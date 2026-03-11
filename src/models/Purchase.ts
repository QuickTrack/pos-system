import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPurchaseItem {
  product: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  quantity: number;
  unitCost: number;
  total: number;
  receivedQuantity: number;
  expiryDate?: Date;
}

export interface IPurchase extends Document {
  orderNumber: string;
  
  // Supplier
  supplier: mongoose.Types.ObjectId;
  supplierName: string;
  
  // Branch
  branch: mongoose.Types.ObjectId;
  
  // Items
  items: IPurchaseItem[];
  
  // Totals
  subtotal: number;
  discount: number;
  discountAmount: number;
  tax: number;
  total: number;
  amountPaid: number;
  balance: number;
  
  // Status
  status: 'pending' | 'ordered' | 'partial' | 'received' | 'cancelled';
  
  // Payment
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  paymentMethod?: 'cash' | 'mpesa' | 'card' | 'credit';
  
  // Dates
  orderDate: Date;
  expectedDeliveryDate?: Date;
  receivedDate?: Date;
  
  // Notes
  notes?: string;
  
  // Received by
  receivedBy?: mongoose.Types.ObjectId;
  receivedByName?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseItemSchema = new Schema<IPurchaseItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitCost: { type: Number, required: true },
    total: { type: Number, required: true },
    receivedQuantity: { type: Number, default: 0 },
    expiryDate: { type: Date },
  },
  { _id: false }
);

const PurchaseSchema = new Schema<IPurchase>(
  {
    orderNumber: { type: String, required: true, unique: true },
    
    // Supplier
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    supplierName: { type: String, required: true },
    
    // Branch
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    
    // Items
    items: [PurchaseItemSchema],
    
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
      enum: ['pending', 'ordered', 'partial', 'received', 'cancelled'], 
      default: 'pending' 
    },
    
    // Payment
    paymentStatus: { 
      type: String, 
      enum: ['unpaid', 'partial', 'paid'], 
      default: 'unpaid' 
    },
    paymentMethod: { 
      type: String, 
      enum: ['cash', 'mpesa', 'card', 'credit'] 
    },
    
    // Dates
    orderDate: { type: Date, default: Date.now },
    expectedDeliveryDate: { type: Date },
    receivedDate: { type: Date },
    
    // Notes
    notes: { type: String },
    
    // Received by
    receivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    receivedByName: { type: String },
  },
  { timestamps: true }
);

// Index for reporting
PurchaseSchema.index({ orderDate: -1 });
PurchaseSchema.index({ supplier: 1, orderDate: -1 });
PurchaseSchema.index({ branch: 1, orderDate: -1 });

const Purchase: Model<IPurchase> = mongoose.models.Purchase || mongoose.model<IPurchase>('Purchase', PurchaseSchema);

export default Purchase;
