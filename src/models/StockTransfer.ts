import mongoose, { Schema, Document, Model } from 'mongoose';

export type TransferStatus = 'pending' | 'approved' | 'in_transit' | 'received' | 'rejected';
export type StockLocation = 'shop' | 'remote';

export interface IStockTransferItem {
  product: mongoose.Types.ObjectId;
  productName: string;
  productSku: string;
  quantity: number;
  receivedQuantity?: number; // For partial receipts
}

export interface IStockTransfer extends Document {
  transferNumber: string;
  sourceLocation: StockLocation;
  destinationLocation: StockLocation;
  status: TransferStatus;
  items: IStockTransferItem[];
  notes?: string;
  
  // Requester info
  requestedBy?: mongoose.Types.ObjectId;
  requestedByName?: string;
  requestDate: Date;
  
  // Approval info
  approvedBy?: mongoose.Types.ObjectId;
  approvedByName?: string;
  approvalDate?: Date;
  approvalNotes?: string;
  
  // Transit info
  shippedBy?: mongoose.Types.ObjectId;
  shippedByName?: string;
  shippedDate?: Date;
  
  // Receipt info
  receivedBy?: mongoose.Types.ObjectId;
  receivedByName?: string;
  receivedDate?: Date;
  receiveNotes?: string;
  
  // Rejection info
  rejectedBy?: mongoose.Types.ObjectId;
  rejectedByName?: string;
  rejectionDate?: Date;
  rejectionReason?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const StockTransferItemSchema = new Schema<IStockTransferItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  productSku: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  receivedQuantity: { type: Number, default: 0 },
});

const StockTransferSchema = new Schema<IStockTransfer>({
  transferNumber: { type: String, required: true, unique: true },
  sourceLocation: { 
    type: String, 
    enum: ['shop', 'remote'], 
    required: true 
  },
  destinationLocation: { 
    type: String, 
    enum: ['shop', 'remote'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'in_transit', 'received', 'rejected'],
    default: 'pending' 
  },
  items: [StockTransferItemSchema],
  notes: { type: String },
  
  // Requester
  requestedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  requestedByName: { type: String },
  requestDate: { type: Date, default: Date.now },
  
  // Approval
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedByName: { type: String },
  approvalDate: { type: Date },
  approvalNotes: { type: String },
  
  // Transit
  shippedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  shippedByName: { type: String },
  shippedDate: { type: Date },
  
  // Receipt
  receivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  receivedByName: { type: String },
  receivedDate: { type: Date },
  receiveNotes: { type: String },
  
  // Rejection
  rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  rejectedByName: { type: String },
  rejectionDate: { type: Date },
  rejectionReason: { type: String },
}, { timestamps: true });

// Generate transfer number
StockTransferSchema.pre('save', async function(next) {
  if (this.isNew && !this.transferNumber) {
    const count = await mongoose.model('StockTransfer').countDocuments();
    this.transferNumber = `TRF-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

const StockTransfer: Model<IStockTransfer> = mongoose.models.StockTransfer || 
  mongoose.model<IStockTransfer>('StockTransfer', StockTransferSchema);

export default StockTransfer;
