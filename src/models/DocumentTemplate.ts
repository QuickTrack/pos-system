import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITemplateElement {
  id: string;
  type: 'text' | 'image' | 'table' | 'divider' | 'qrcode' | 'barcode' | 'signature' | 'shape' | 'spacer';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  content?: string;
  src?: string;
  fontSize?: number;
  fontWeight?: string;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  // Table specific
  columns?: Array<{
    key: string;
    title: string;
    width?: number;
    align?: 'left' | 'center' | 'right';
  }>;
  source?: string;
  // Shape specific
  shapeType?: 'rectangle' | 'circle' | 'line';
}

export interface ITemplate extends Document {
  name: string;
  description?: string;
  category: 'receipt' | 'invoice' | 'order' | 'quotation' | 'delivery' | 'purchase' | 'payment' | 'other';
  pageSize: '58mm' | '80mm' | 'A4' | 'A4_LANDSCAPE' | 'HALF_PAGE' | 'CUSTOM';
  pageWidth?: number;
  pageHeight?: number;
  orientation: 'portrait' | 'landscape';
  elements: ITemplateElement[];
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  isDefault?: boolean;
  isBuiltIn?: boolean;
  branch?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TemplateElementSchema = new Schema<ITemplateElement>({
  id: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['text', 'image', 'table', 'divider', 'qrcode', 'barcode', 'signature', 'shape', 'spacer'],
    required: true 
  },
  x: { type: Number, required: true, default: 0 },
  y: { type: Number, required: true, default: 0 },
  width: { type: Number, required: true, default: 100 },
  height: { type: Number, required: true, default: 30 },
  rotation: { type: Number, default: 0 },
  content: { type: String },
  src: { type: String },
  fontSize: { type: Number, default: 12 },
  fontWeight: { type: String, default: 'normal' },
  fontFamily: { type: String, default: 'monospace' },
  color: { type: String, default: '#000000' },
  backgroundColor: { type: String },
  textAlign: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
  borderColor: { type: String },
  borderWidth: { type: Number, default: 0 },
  borderRadius: { type: Number, default: 0 },
  lineStyle: { type: String, enum: ['solid', 'dashed', 'dotted'], default: 'solid' },
  columns: [{
    key: { type: String, required: true },
    title: { type: String, required: true },
    width: { type: Number },
    align: { type: String, enum: ['left', 'center', 'right'], default: 'left' }
  }],
  source: { type: String },
  shapeType: { type: String, enum: ['rectangle', 'circle', 'line'], default: 'rectangle' }
}, { _id: false });

const DocumentTemplateSchema = new Schema<ITemplate>({
  name: { type: String, required: true },
  description: { type: String },
  category: { 
    type: String, 
    enum: ['receipt', 'invoice', 'order', 'quotation', 'delivery', 'purchase', 'payment', 'other'],
    required: true 
  },
  pageSize: { 
    type: String, 
    enum: ['58mm', '80mm', 'A4', 'A4_LANDSCAPE', 'HALF_PAGE', 'CUSTOM'],
    required: true,
    default: 'A4'
  },
  pageWidth: { type: Number },
  pageHeight: { type: Number },
  orientation: { 
    type: String, 
    enum: ['portrait', 'landscape'],
    default: 'portrait'
  },
  elements: [TemplateElementSchema],
  margins: {
    top: { type: Number, default: 10 },
    right: { type: Number, default: 10 },
    bottom: { type: Number, default: 10 },
    left: { type: Number, default: 10 }
  },
  isDefault: { type: Boolean, default: false },
  isBuiltIn: { type: Boolean, default: false },
  branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});

// Index for faster queries
DocumentTemplateSchema.index({ category: 1, branch: 1 });
DocumentTemplateSchema.index({ isDefault: 1 });

const DocumentTemplate: Model<ITemplate> = mongoose.models.DocumentTemplate || mongoose.model<ITemplate>('DocumentTemplate', DocumentTemplateSchema);

export default DocumentTemplate;
