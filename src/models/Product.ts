import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  category: mongoose.Types.ObjectId;
  brand?: string;
  
  // Pricing
  retailPrice: number;
  wholesalePrice: number;
  distributorPrice: number;
  
  // Cost
  costPrice: number;
  
  // Multiple pricing tiers
  pricingTiers?: {
    name: string;
    minQuantity: number;
    price: number;
  }[];
  
  // Stock
  stockQuantity: number;
  lowStockThreshold: number;
  branch?: mongoose.Types.ObjectId;
  
  // Variants
  variants?: {
    name: string;
    value: string;
    sku?: string;
    barcode?: string;
    stockQuantity?: number;
    retailPrice?: number;
  }[];
  
  // Expiry
  expiryDate?: Date;
  
  // Units
  unit: string;
  unitSize?: string;
  weight?: number;
  
  // Status
  isActive: boolean;
  isTrackStock: boolean;
  
  // Image
  image?: string;
  images?: string[];
  
  // Supplier
  supplier?: mongoose.Types.ObjectId;
  
  // Barcode
  barcodeFormat?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    barcode: { type: String, index: true },
    description: { type: String },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    brand: { type: String },
    
    // Pricing
    retailPrice: { type: Number, required: true, default: 0 },
    wholesalePrice: { type: Number, default: 0 },
    distributorPrice: { type: Number, default: 0 },
    
    // Cost
    costPrice: { type: Number, default: 0 },
    
    // Multiple pricing tiers
    pricingTiers: [{
      name: String,
      minQuantity: Number,
      price: Number,
    }],
    
    // Stock
    stockQuantity: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 10 },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    
    // Variants
    variants: [{
      name: String,
      value: String,
      sku: String,
      barcode: String,
      stockQuantity: Number,
      retailPrice: Number,
    }],
    
    // Expiry
    expiryDate: { type: Date },
    
    // Units
    unit: { type: String, default: 'piece' },
    unitSize: { type: String },
    weight: { type: Number },
    
    // Status
    isActive: { type: Boolean, default: true },
    isTrackStock: { type: Boolean, default: true },
    
    // Image
    image: { type: String },
    images: [{ type: String }],
    
    // Supplier
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    
    // Barcode
    barcodeFormat: { type: String },
  },
  { timestamps: true }
);

// Index for searching
ProductSchema.index({ name: 'text', sku: 'text', barcode: 'text' });

const Product: Model<IProduct> = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);

export default Product;
