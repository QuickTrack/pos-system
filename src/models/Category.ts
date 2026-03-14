import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  code: string;
  description?: string;
  parentCategory?: mongoose.Types.ObjectId;
  parentName?: string;
  level: number;
  path: string;
  image?: string;
  isActive: boolean;
  branch?: mongoose.Types.ObjectId;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    description: { type: String },
    parentCategory: { type: Schema.Types.ObjectId, ref: 'Category' },
    parentName: { type: String },
    level: { type: Number, default: 0 },
    path: { type: String, default: '' },
    image: { type: String },
    isActive: { type: Boolean, default: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Category: Model<ICategory> = mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);

export default Category;
