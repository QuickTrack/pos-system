import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IExpenseAttachment {
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  uploadedAt: Date;
}

export interface IPayeeInfo {
  type: 'supplier' | 'employee' | 'contractor' | 'casual_worker' | 'utility_provider' | 'other';
  name: string;
  phoneNumber?: string;
  referenceNumber?: string;
  supplierId?: mongoose.Types.ObjectId;
  employeeId?: mongoose.Types.ObjectId;
  contractorId?: mongoose.Types.ObjectId;
}

export interface IExpense extends Document {
  transactionNumber: string;
  shift?: mongoose.Types.ObjectId;
  dateTime: Date;
  branch: mongoose.Types.ObjectId;
  branchName?: string;
  department?: string;
  expenseCategory: mongoose.Types.ObjectId;
  expenseCategoryName?: string;
  expenseSubcategory?: string;
  description: string;
  amount: number;
  paymentSource: 'cash_drawer' | 'main_till' | 'petty_cash' | 'bank_account' | 'mpesa_paybill' | 'mpesa_till' | 'business_number';
  paymentSourceDetail?: string;
  bankAccountId?: mongoose.Types.ObjectId;
  bankAccountName?: string;
  payeeType: IPayeeInfo['type'];
  payeeName: string;
  payeePhoneNumber?: string;
  payeeReferenceNumber?: string;
  payeeSupplierId?: mongoose.Types.ObjectId;
  payeeEmployeeId?: mongoose.Types.ObjectId;
  attachments: IExpenseAttachment[];
  notes?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approvedBy?: mongoose.Types.ObjectId;
  approvedByName?: string;
  approvedAt?: Date;
  rejectedBy?: mongoose.Types.ObjectId;
  rejectedByName?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  createdBy: mongoose.Types.ObjectId;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}

const PayeeInfoSchema = new Schema<IPayeeInfo>(
  {
    type: {
      type: String,
      enum: ['supplier', 'employee', 'contractor', 'casual_worker', 'utility_provider', 'other'],
      required: true,
    },
    name: { type: String, required: true },
    phoneNumber: { type: String },
    referenceNumber: { type: String },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    employeeId: { type: Schema.Types.ObjectId, ref: 'User' },
    contractorId: { type: Schema.Types.ObjectId },
  },
  { _id: false }
);

const ExpenseAttachmentSchema = new Schema<IExpenseAttachment>(
  {
    fileName: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    filePath: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ExpenseSchema = new Schema<IExpense>(
  {
    transactionNumber: { type: String, required: true, unique: true },
    shift: { type: Schema.Types.ObjectId, ref: 'Shift' },
    dateTime: { type: Date, default: Date.now },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    branchName: { type: String },
    department: { type: String },
    expenseCategory: { type: Schema.Types.ObjectId, ref: 'ExpenseCategory', required: true },
    expenseCategoryName: { type: String },
    expenseSubcategory: { type: String },
    description: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    paymentSource: {
      type: String,
      enum: ['cash_drawer', 'main_till', 'petty_cash', 'bank_account', 'mpesa_paybill', 'mpesa_till', 'business_number'],
      required: true,
    },
    paymentSourceDetail: { type: String },
    bankAccountId: { type: Schema.Types.ObjectId, ref: 'BankAccount' },
    bankAccountName: { type: String },
    payeeType: {
      type: String,
      enum: ['supplier', 'employee', 'contractor', 'casual_worker', 'utility_provider', 'other'],
      required: true,
    },
    payeeName: { type: String, required: true },
    payeePhoneNumber: { type: String },
    payeeReferenceNumber: { type: String },
    payeeSupplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    payeeEmployeeId: { type: Schema.Types.ObjectId, ref: 'User' },
    attachments: [ExpenseAttachmentSchema],
    notes: { type: String },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedByName: { type: String },
    approvedAt: { type: Date },
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectedByName: { type: String },
    rejectedAt: { type: Date },
    rejectionReason: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String, required: true },
  },
  { timestamps: true }
);

ExpenseSchema.index({ transactionNumber: 1 });
ExpenseSchema.index({ shift: 1 });
ExpenseSchema.index({ branch: 1, dateTime: -1 });
ExpenseSchema.index({ expenseCategory: 1, dateTime: -1 });
ExpenseSchema.index({ status: 1, dateTime: -1 });
ExpenseSchema.index({ paymentSource: 1, dateTime: -1 });
ExpenseSchema.index({ createdBy: 1, dateTime: -1 });

const Expense: Model<IExpense> = mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema);

export default Expense;
