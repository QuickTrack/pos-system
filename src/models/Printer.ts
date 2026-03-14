import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPrinterConnection {
  type: 'usb' | 'bluetooth' | 'network' | 'serial';
  address?: string;
  port?: number;
  vendorId?: number;
  productId?: number;
  uuid?: string;
  baudRate?: number;
}

export interface IPrinterQuality {
  dpi: number;
  copies: number;
  cutPaper: boolean;
  cashDrawer: boolean;
  beep: boolean;
}

export interface IPrinter extends Document {
  name: string;
  printerModel: string;
  connection: IPrinterConnection;
  paperSize: '58mm' | '80mm' | 'A4' | 'A4_LANDSCAPE' | 'HALF_PAGE' | 'CUSTOM';
  encoding: 'PC437' | 'PC850' | 'PC860' | 'PC863' | 'PC865' | 'PC858' | 'GB18030' | 'SHIFT_JIS' | 'EUC_KR' | 'UTF8';
  maxPrintWidth: number;
  supportQR: boolean;
  supportCJK: boolean;
  quality: IPrinterQuality;
  isDefault?: boolean;
  branch?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PrinterConnectionSchema = new Schema<IPrinterConnection>({
  type: { 
    type: String, 
    enum: ['usb', 'bluetooth', 'network', 'serial'], 
    required: true 
  },
  address: { type: String },
  port: { type: Number },
  vendorId: { type: Number },
  productId: { type: Number },
  uuid: { type: String },
  baudRate: { type: Number, default: 9600 }
}, { _id: false });

const PrinterQualitySchema = new Schema<IPrinterQuality>({
  dpi: { type: Number, default: 203 },
  copies: { type: Number, default: 1 },
  cutPaper: { type: Boolean, default: true },
  cashDrawer: { type: Boolean, default: false },
  beep: { type: Boolean, default: false }
}, { _id: false });

const PrinterSchema = new Schema<IPrinter>({
  name: { type: String, required: true },
  printerModel: { 
    type: String, 
    enum: [
      'generic', 
      'epson-tm-t88', 
      'epson-tm-u220', 
      'citizen-ct-s2000', 
      'star-tup500',
      'posiflex-pp-8000',
      'xprinter-xp-58',
      'xprinter-xp-80',
      'gprinter-gp-1324',
      'custom'
    ],
    default: 'generic'
  },
  connection: { type: PrinterConnectionSchema, required: true },
  paperSize: { 
    type: String, 
    enum: ['58mm', '80mm', 'A4', 'A4_LANDSCAPE', 'HALF_PAGE', 'CUSTOM'],
    default: '80mm'
  },
  encoding: { 
    type: String, 
    enum: ['PC437', 'PC850', 'PC860', 'PC863', 'PC865', 'PC858', 'GB18030', 'SHIFT_JIS', 'EUC_KR', 'UTF8'],
    default: 'PC437'
  },
  maxPrintWidth: { type: Number, default: 576 },
  supportQR: { type: Boolean, default: true },
  supportCJK: { type: Boolean, default: false },
  quality: { type: PrinterQualitySchema, default: () => ({}) },
  isDefault: { type: Boolean, default: false },
  branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});

// Index for queries
PrinterSchema.index({ branch: 1, isActive: 1 });
PrinterSchema.index({ isDefault: 1 });

const Printer: Model<IPrinter> = mongoose.models.Printer || mongoose.model<IPrinter>('Printer', PrinterSchema);

export default Printer;
