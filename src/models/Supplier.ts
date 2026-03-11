import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISupplier extends Document {
  name: string;
  code: string;
  email?: string;
  phone: string;
  address?: string;
  
  // Business Info
  businessName?: string;
  kraPin?: string;
  
  // Financial
  balance: number;
  totalPurchases: number;
  
  // Branch
  branch?: mongoose.Types.ObjectId;
  
  // Status
  isActive: boolean;
  
  // Notes
  notes?: string;
  
  // Contact Person
  contactPerson?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    email: { type: String, lowercase: true },
    phone: { type: String, required: true },
    address: { type: String },
    
    // Business Info
    businessName: { type: String },
    kraPin: { type: String },
    
    // Financial
    balance: { type: Number, default: 0 },
    totalPurchases: { type: Number, default: 0 },
    
    // Branch
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    
    // Status
    isActive: { type: Boolean, default: true },
    
    // Notes
    notes: { type: String },
    
    // Contact Person
    contactPerson: { type: String },
  },
  { timestamps: true }
);

const Supplier: Model<ISupplier> = mongoose.models.Supplier || mongoose.model<ISupplier>('Supplier', SupplierSchema);

export default Supplier;
