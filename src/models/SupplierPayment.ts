import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISupplierPayment extends Document {
  supplier: mongoose.Types.ObjectId;
  supplierName: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: 'cash' | 'mpesa' | 'card' | 'bank_transfer' | 'credit';
  invoiceNumbers: string[];
  status: 'pending' | 'partial' | 'paid';
  notes?: string;
  recordedBy?: mongoose.Types.ObjectId;
  recordedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierPaymentSchema = new Schema<ISupplierPayment>(
  {
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    supplierName: { type: String, required: true },
    amount: { type: Number, required: true },
    paymentDate: { type: Date, default: Date.now },
    paymentMethod: { 
      type: String, 
      enum: ['cash', 'mpesa', 'card', 'bank_transfer', 'credit'],
      default: 'cash'
    },
    invoiceNumbers: [{ type: String }],
    status: { 
      type: String, 
      enum: ['pending', 'partial', 'paid'],
      default: 'pending'
    },
    notes: { type: String },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    recordedAt: { type: Date },
  },
  { timestamps: true }
);

const SupplierPayment: Model<ISupplierPayment> = mongoose.models.SupplierPayment || 
  mongoose.model<ISupplierPayment>('SupplierPayment', SupplierPaymentSchema);

export default SupplierPayment;