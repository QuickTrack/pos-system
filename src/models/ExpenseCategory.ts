import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IExpenseCategory extends Document {
  name: string;
  description?: string;
  parentCategory?: mongoose.Types.ObjectId;
  parentName?: string;
  level: number;
  path: string;
  isActive: boolean;
  branch?: mongoose.Types.ObjectId;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseCategorySchema = new Schema<IExpenseCategory>(
  {
    name: { type: String, required: true },
    description: { type: String },
    parentCategory: { type: Schema.Types.ObjectId, ref: 'ExpenseCategory' },
    parentName: { type: String },
    level: { type: Number, default: 0 },
    path: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const ExpenseCategory: Model<IExpenseCategory> = mongoose.models.ExpenseCategory || mongoose.model<IExpenseCategory>('ExpenseCategory', ExpenseCategorySchema);

export default ExpenseCategory;
