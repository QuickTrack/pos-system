import mongoose, { Schema, Document, Model } from 'mongoose';

export type MovementType = 
  | 'purchase'           // Stock received from supplier
  | 'sale'                // Stock sold
  | 'transfer_out'        // Stock transferred to another location
  | 'transfer_in'         // Stock received from transfer
  | 'adjustment'          // Manual stock adjustment
  | 'return'              // Customer return
  | 'return_to_supplier'  // Returned to supplier
  | 'damage'              // Stock damaged/write-off
  | 'opening_balance';   // Initial opening balance

export type StockLocation = 'shop' | 'remote' | 'both';

export interface IStockAudit extends Document {
  product: mongoose.Types.ObjectId;
  productName: string;
  productSku: string;
  
  // Movement details
  movementType: MovementType;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  
  // Location
  location: StockLocation;
  sourceLocation?: StockLocation; // For transfers
  destinationLocation?: StockLocation; // For transfers
  
  // Reference
  referenceType?: 'sale' | 'purchase' | 'transfer' | 'adjustment' | 'return' | 'supplier' | 'none';
  referenceId?: mongoose.Types.ObjectId;
  referenceNumber?: string; // Invoice number, transfer number, etc.
  
  // Supplier reference (for purchases)
  supplier?: mongoose.Types.ObjectId;
  supplierName?: string;
  supplierInvoiceNumber?: string;
  
  // User who made the change
  user?: mongoose.Types.ObjectId;
  userName: string;
  
  // Notes
  notes?: string;
  
  // Timestamp
  createdAt: Date;
}

const StockAuditSchema = new Schema<IStockAudit>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  productSku: { type: String, required: true },
  
  movementType: { 
    type: String, 
    enum: ['purchase', 'sale', 'transfer_out', 'transfer_in', 'adjustment', 'return', 'return_to_supplier', 'damage', 'opening_balance'],
    required: true 
  },
  quantity: { type: Number, required: true },
  quantityBefore: { type: Number, required: true },
  quantityAfter: { type: Number, required: true },
  
  location: { 
    type: String, 
    enum: ['shop', 'remote', 'both'],
    required: true 
  },
  sourceLocation: { type: String, enum: ['shop', 'remote', 'both'] },
  destinationLocation: { type: String, enum: ['shop', 'remote', 'both'] },
  
  referenceType: { 
    type: String, 
    enum: ['sale', 'purchase', 'transfer', 'adjustment', 'return', 'supplier', 'none'] 
  },
  referenceId: { type: Schema.Types.ObjectId },
  referenceNumber: { type: String },
  
  supplier: { type: Schema.Types.ObjectId, ref: 'Supplier' },
  supplierName: { type: String },
  supplierInvoiceNumber: { type: String },
  
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  userName: { type: String, required: true },
  
  notes: { type: String },
}, { timestamps: true });

// Index for efficient queries
StockAuditSchema.index({ product: 1, createdAt: -1 });
StockAuditSchema.index({ movementType: 1, createdAt: -1 });
StockAuditSchema.index({ location: 1, createdAt: -1 });
StockAuditSchema.index({ referenceType: 1, referenceId: 1 });

const StockAudit: Model<IStockAudit> = mongoose.models.StockAudit || 
  mongoose.model<IStockAudit>('StockAudit', StockAuditSchema);

export default StockAudit;
