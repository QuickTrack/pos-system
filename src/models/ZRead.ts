import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISalesBreakdown {
  grossSales: number;
  discounts: number;
  returns: number;
  netSales: number;
  totalTransactions: number;
  refunds: number;
  voids: number;
}

export interface IPaymentBreakdown {
  cash: number;
  mpesa: number;
  card: number;
  bank: number;
  credit: number;
  mixed: number;
}

export interface ITaxSummary {
  vatCollected: number;
  taxableSales: number;
  zeroRatedSales: number;
  taxRate: number;
}

export interface ICashSummary {
  openingFloat: number;
  cashReceived: number;
  cashDrops: number;
  expenses: number;
  expectedCash: number;
  actualCash: number;
  variance: number;
}

export interface IZRead extends Document {
  readId: string;
  shift: mongoose.Types.ObjectId;
  date: Date;
  branch: mongoose.Types.ObjectId;
  cashier: mongoose.Types.ObjectId;
  cashierName: string;
  register: mongoose.Types.ObjectId;
  registerNumber: string;
  salesBreakdown: ISalesBreakdown;
  paymentBreakdown: IPaymentBreakdown;
  taxSummary: ITaxSummary;
  cashSummary: ICashSummary;
  generatedAt: Date;
  generatedBy: mongoose.Types.ObjectId;
  generatedByName: string;
  createdAt: Date;
}

const SalesBreakdownSchema = new Schema<ISalesBreakdown>(
  {
    grossSales: { type: Number, default: 0 },
    discounts: { type: Number, default: 0 },
    returns: { type: Number, default: 0 },
    netSales: { type: Number, default: 0 },
    totalTransactions: { type: Number, default: 0 },
    refunds: { type: Number, default: 0 },
    voids: { type: Number, default: 0 },
  },
  { _id: false }
);

const PaymentBreakdownSchema = new Schema<IPaymentBreakdown>(
  {
    cash: { type: Number, default: 0 },
    mpesa: { type: Number, default: 0 },
    card: { type: Number, default: 0 },
    bank: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    mixed: { type: Number, default: 0 },
  },
  { _id: false }
);

const TaxSummarySchema = new Schema<ITaxSummary>(
  {
    vatCollected: { type: Number, default: 0 },
    taxableSales: { type: Number, default: 0 },
    zeroRatedSales: { type: Number, default: 0 },
    taxRate: { type: Number, default: 16 },
  },
  { _id: false }
);

const CashSummarySchema = new Schema<ICashSummary>(
  {
    openingFloat: { type: Number, default: 0 },
    cashReceived: { type: Number, default: 0 },
    cashDrops: { type: Number, default: 0 },
    expenses: { type: Number, default: 0 },
    expectedCash: { type: Number, default: 0 },
    actualCash: { type: Number, default: 0 },
    variance: { type: Number, default: 0 },
  },
  { _id: false }
);

const ZReadSchema = new Schema<IZRead>(
  {
    readId: { type: String, required: true, unique: true },
    shift: { type: Schema.Types.ObjectId, ref: 'Shift', required: true },
    date: { type: Date, required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    cashier: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    cashierName: { type: String, required: true },
    register: { type: Schema.Types.ObjectId, ref: 'Register', required: true },
    registerNumber: { type: String, required: true },
    salesBreakdown: { type: SalesBreakdownSchema, required: true },
    paymentBreakdown: { type: PaymentBreakdownSchema, required: true },
    taxSummary: { type: TaxSummarySchema, required: true },
    cashSummary: { type: CashSummarySchema, required: true },
    generatedAt: { type: Date, default: Date.now },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    generatedByName: { type: String, required: true },
  },
  { timestamps: true }
);

ZReadSchema.index({ readId: 1 });
ZReadSchema.index({ shift: 1 });
ZReadSchema.index({ branch: 1, date: -1 });
ZReadSchema.index({ register: 1, date: -1 });
ZReadSchema.index({ date: -1 });

const ZRead: Model<IZRead> = mongoose.models.ZRead || mongoose.model<IZRead>('ZRead', ZReadSchema);

export default ZRead;
