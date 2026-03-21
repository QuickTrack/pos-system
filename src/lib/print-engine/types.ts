// ============================================================
// CORE PRINTING ENGINE TYPES AND INTERFACES
// ============================================================

// Document Types
export type DocumentType = 
  | 'receipt' 
  | 'invoice' 
  | 'creditInvoice'
  | 'order' 
  | 'quotation' 
  | 'delivery' 
  | 'purchase' 
  | 'payment'
  | 'statement'
  | 'transaction';

// Paper Sizes (in mm)
export type PaperSize = '58mm' | '80mm' | 'A4' | 'A4_LANDSCAPE' | 'HALF_PAGE' | 'CUSTOM';

// Paper dimensions in dots (assuming 203 DPI for thermal printers)
export const PAPER_DIMENSIONS: Record<PaperSize, { width: number; height: number }> = {
  '58mm': { width: 384, height: 0 }, // 0 = continuous
  '80mm': { width: 576, height: 0 },
  'A4': { width: 595, height: 842 },
  'A4_LANDSCAPE': { width: 842, height: 595 },
  'HALF_PAGE': { width: 595, height: 421 },
  'CUSTOM': { width: 0, height: 0 }
};

// Character Encodings
export type CharacterEncoding = 
  | 'PC437'   // USA, Standard Europe
  | 'PC850'   // Multilingual
  | 'PC860'   // Portuguese
  | 'PC863'   // Canadian-French
  | 'PC865'   // Nordic
  | 'PC858'   // Euro
  | 'GB18030' // Chinese
  | 'SHIFT_JIS' // Japanese
  | 'EUC_KR'  // Korean
  | 'UTF8';   // Unicode

// Printer Connection Types
export type ConnectionType = 'usb' | 'bluetooth' | 'network' | 'serial';

// Printer Models (common ESC/POS compatible)
export type PrinterModel = 
  | 'generic'           // Generic ESC/POS
  | 'epson-tm-t88'      // Epson TM-T88 series
  | 'epson-tm-u220'     // Epson TM-U220
  | 'citizen-ct-s2000'  // Citizen CT-S2000
  | 'star-tup500'       // Star TUP500
  | 'posiflex-pp-8000'  // Posiflex PP-8000
  | 'xprinter-xp-58'   // Xprinter XP-58
  | 'xprinter-xp-80'   // Xprinter XP-80
  | 'gprinter-gp-1324' // Gprinter GP-1324D
  | 'custom';          // Custom commands

// Output Format
export type OutputFormat = 'escpos' | 'pdf' | 'raw';

// Text Formatting
export interface TextFormat {
  bold?: boolean;
  underline?: boolean;
  italic?: boolean;
  doubleHeight?: boolean;
  doubleWidth?: boolean;
  alignment?: 'left' | 'center' | 'right';
  font?: 'a' | 'b' | 'c';
  color?: 1 | 2; // 1 = black/red, 2 = magenta/magenta
}

// Print Quality
export interface PrintQuality {
  dpi: number;
  copies: number;
  cutPaper: boolean;
  cashDrawer: boolean;
  beep: boolean;
}

// Barcode Types
export type BarcodeType = 
  | 'UPC_A' 
  | 'UPC_E' 
  | 'EAN13' 
  | 'EAN8' 
  | 'CODE39' 
  | 'ITF' 
  | 'CODABAR' 
  | 'CODE93' 
  | 'CODE128'
  | 'QR';

// QR Code Error Correction Levels
export type QRErrorCorrection = 'L' | 'M' | 'Q' | 'H';

// QR Code Models
export type QRModel = '1' | '2';

// Printer Status
export interface PrinterStatus {
  online: boolean;
  paper: 'ok' | 'low' | 'out';
  cashDrawer: 'open' | 'closed';
  error?: string;
}

// Print Job Status
export type PrintJobStatus = 
  | 'pending'
  | 'sending'
  | 'completed'
  | 'failed'
  | 'cancelled';

// Print Job
export interface PrintJob {
  id: string;
  documentType: DocumentType;
  documentId: string;
  templateId?: string;
  printerId: string;
  outputFormat: OutputFormat;
  status: PrintJobStatus;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
  copies: number;
  options: PrintOptions;
}

// Printer Configuration
export interface PrinterConfig {
  id: string;
  name: string;
  model: PrinterModel;
  connection: {
    type: ConnectionType;
    address?: string;    // IP address for network, port for serial
    port?: number;
    vendorId?: number;   // USB vendor ID
    productId?: number;  // USB product ID
    uuid?: string;       // Bluetooth UUID
  };
  paperSize: PaperSize;
  encoding: CharacterEncoding;
  maxPrintWidth: number;
  supportQR: boolean;
  supportCJK: boolean;
  quality: PrintQuality;
  isDefault?: boolean;
  branch?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Print Options
export interface PrintOptions {
  copies: number;
  cutPaper: boolean;
  cashDrawer: boolean;
  beep: boolean;
  preview: boolean;
  encoding: CharacterEncoding;
  timeout: number;
}

// Data Binding Context
export interface PrintDataContext {
  business: {
    name: string;
    address: string;
    phone: string;
    email?: string;
    website?: string;
    logo?: string;
    kraPin?: string;
    vatNumber?: string;
    bankName?: string;
    bankAccount?: string;
    bankBranch?: string;
  };
  invoice?: {
    number: string;
    date: string;
    dueDate?: string;
    subtotal: string;
    tax: string;
    taxRate: string;
    total: string;
    paymentTerms?: string;
    discount?: string;
    status?: string;
  };
  creditInvoice?: {
    number: string;
    date: string;
    dueDate?: string;
    referenceNumber?: string;
    reason?: string;
    subtotal: string;
    tax: string;
    taxRate: string;
    total: string;
    paymentTerms?: string;
    notes?: string;
  };
  customer?: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    tin?: string;
  };
  supplier?: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  cashier?: {
    name: string;
    id?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: string;
    total: string;
    sku?: string;
    unit?: string;
    discount?: string;
  }>;
  payment?: {
    amount: string;
    method: string;
    reference?: string;
    change?: string;
  };
  delivery?: {
    number: string;
    date: string;
    recipientName: string;
    recipientAddress: string;
    recipientPhone: string;
    orderNumber?: string;
    notes?: string;
  };
  purchase?: {
    number: string;
    date: string;
    expectedDelivery?: string;
    subtotal: string;
    tax: string;
    total: string;
    notes?: string;
  };
  quotation?: {
    number: string;
    date: string;
    validUntil: string;
    subtotal: string;
    tax: string;
    total: string;
    terms?: string;
  };
  transaction?: {
    id: string;
    type: string;
    amount: string;
    reference: string;
    timestamp: string;
    status: string;
  };
  statement?: {
    period: string;
    startDate: string;
    endDate: string;
    openingBalance: string;
    closingBalance: string;
    transactions: Array<{
      date: string;
      description: string;
      debit: string;
      credit: string;
      balance: string;
    }>;
  };
  order?: {
    number: string;
    date: string;
    status: string;
    notes?: string;
  };
  [key: string]: any;
}

// Print Result
export interface PrintResult {
  success: boolean;
  jobId?: string;
  output?: Buffer | string;
  pdfUrl?: string;
  error?: string;
  status?: PrinterStatus;
}

// Template Element mapped for printing
export interface PrintableElement {
  id: string;
  type: 'text' | 'image' | 'table' | 'divider' | 'qrcode' | 'barcode' | 'signature' | 'shape' | 'spacer';
  x: number;
  y: number;
  width: number;
  height: number;
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
  columns?: Array<{
    key: string;
    title: string;
    width?: number;
    align?: 'left' | 'center' | 'right';
  }>;
  source?: string;
  shapeType?: 'rectangle' | 'circle' | 'line';
  rotation?: number;
}

// Printable Template
export interface PrintableTemplate {
  name: string;
  category: DocumentType;
  pageSize: PaperSize;
  pageWidth?: number;
  pageHeight?: number;
  orientation: 'portrait' | 'landscape';
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  elements: PrintableElement[];
}

// Error handling
export class PrintEngineError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'PrintEngineError';
  }
}

export class PrinterConnectionError extends PrintEngineError {
  constructor(message: string, details?: any) {
    super(message, 'PRINTER_CONNECTION_ERROR', details);
    this.name = 'PrinterConnectionError';
  }
}

export class PrinterNotFoundError extends PrintEngineError {
  constructor(printerId: string) {
    super(`Printer notinterId}`, ' found: ${prPRINTER_NOT_FOUND', { printerId });
    this.name = 'PrinterNotFoundError';
  }
}

export class TemplateRenderError extends PrintEngineError {
  constructor(message: string, details?: any) {
    super(message, 'TEMPLATE_RENDER_ERROR', details);
    this.name = 'TemplateRenderError';
  }
}

export class BarcodeGenerationError extends PrintEngineError {
  constructor(message: string, details?: any) {
    super(message, 'BARCODE_GENERATION_ERROR', details);
    this.name = 'BarcodeGenerationError';
  }
}

export class PDFGenerationError extends PrintEngineError {
  constructor(message: string, details?: any) {
    super(message, 'PDF_GENERATION_ERROR', details);
    this.name = 'PDFGenerationError';
  }
}
