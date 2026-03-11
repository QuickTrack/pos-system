import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  code: string;
  description?: string;
  parentCategory?: mongoose.Types.ObjectId;
  image?: string;
  isActive: boolean;
  branch?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    description: { type: String },
    parentCategory: { type: Schema.Types.ObjectId, ref: 'Category' },
    image: { type: String },
    isActive: { type: Boolean, default: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
  },
  { timestamps: true }
);

const Category: Model<ICategory> = mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);

export default Category;
