import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomerPayment extends Document {
  paymentId: string;
  customer: mongoose.Types.ObjectId;
  customerName: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: string;
  referenceNumber?: string;
  invoiceNumbers: string[];
  status: 'pending' | 'partial' | 'paid';
  notes?: string;
  recordedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerPaymentSchema = new Schema<ICustomerPayment>(
  {
    paymentId: {
      type: String,
      required: true,
      unique: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'mpesa', 'card', 'bank_transfer', 'credit'],
      default: 'cash',
    },
    referenceNumber: {
      type: String,
    },
    invoiceNumbers: [{
      type: String,
    }],
    status: {
      type: String,
      enum: ['pending', 'partial', 'paid'],
      default: 'pending',
    },
    notes: {
      type: String,
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Generate unique payment ID
CustomerPaymentSchema.pre('save', async function (next) {
  if (!this.paymentId) {
    const count = await mongoose.model('CustomerPayment').countDocuments();
    this.paymentId = `CPAY-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

export default mongoose.models.CustomerPayment || mongoose.model<ICustomerPayment>('CustomerPayment', CustomerPaymentSchema);