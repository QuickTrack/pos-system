import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICustomer extends Document {
  name: string;
  email?: string;
  phone: string;
  address?: string;
  
  // Credit & Loyalty
  creditBalance: number;
  loyaltyPoints: number;
  creditLimit?: number;
  
  // Customer Type
  customerType: 'retail' | 'wholesale' | 'distributor';
  
  // Business Info (for wholesale/distributor)
  businessName?: string;
  kraPin?: string;
  
  // Branch
  branch?: mongoose.Types.ObjectId;
  
  // Status
  isActive: boolean;
  
  // Notes
  notes?: string;
  
  // Total purchases
  totalPurchases: number;
  totalSpent: number;
  
  // Last purchase
  lastPurchaseDate?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true },
    email: { type: String, lowercase: true },
    phone: { type: String, required: true },
    address: { type: String },
    
    // Credit & Loyalty
    creditBalance: { type: Number, default: 0 },
    loyaltyPoints: { type: Number, default: 0 },
    creditLimit: { type: Number, default: 0 },
    
    // Customer Type
    customerType: { 
      type: String, 
      enum: ['retail', 'wholesale', 'distributor'], 
      default: 'retail' 
    },
    
    // Business Info
    businessName: { type: String },
    kraPin: { type: String },
    
    // Branch
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    
    // Status
    isActive: { type: Boolean, default: true },
    
    // Notes
    notes: { type: String },
    
    // Total purchases
    totalPurchases: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    
    // Last purchase
    lastPurchaseDate: { type: Date },
  },
  { timestamps: true }
);

// Index for phone search
CustomerSchema.index({ phone: 1 });
CustomerSchema.index({ name: 'text', phone: 'text' });

const Customer: Model<ICustomer> = mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);

export default Customer;
