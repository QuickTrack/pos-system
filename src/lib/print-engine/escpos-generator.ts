// ============================================================
// ESC/POS COMMAND GENERATOR
// Generates ESC/POS commands for thermal receipt printers
// ============================================================

import { 
  CharacterEncoding, 
  BarcodeType, 
  QRErrorCorrection, 
  QRModel,
  PrinterModel,
  TextFormat,
  BarcodeGenerationError 
} from './types';

// ESC/POS Constants
const ESC = 0x1B;
const GS = 0x1D;
const FS = 0x1C;
const DLE = 0x10;
const DC1 = 0x11;
const DC2 = 0x12;
const DC3 = 0x13;
const DC4 = 0x14;
const CAN = 0x18;
const SUB = 0x1A;
const SP = 0x20;
const NL = 0x0A;
const CR = 0x0D;

// Character encoding tables
const ENCODING_TABLES: Record<CharacterEncoding, number> = {
  'PC437': 0,
  'PC850': 2,
  'PC860': 3,
  'PC863': 4,
  'PC865': 5,
  'PC858': 17,
  'GB18030': 28,
  'SHIFT_JIS': 17,
  'EUC_KR': 17,
  'UTF8': 17
};

export class ESCPOSGenerator {
  private buffer: number[];
  private encoding: CharacterEncoding;
  private model: PrinterModel;
  
  constructor(options?: { encoding?: CharacterEncoding; model?: PrinterModel }) {
    this.buffer = [];
    this.encoding = options?.encoding || 'PC437';
    this.model = options?.model || 'generic';
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  private addByte(byte: number): void {
    if (byte < 0 || byte > 255) {
      throw new Error(`Invalid byte value: ${byte}`);
    }
    this.buffer.push(byte);
  }

  private addBytes(bytes: number[]): void {
    this.buffer.push(...bytes);
  }

  private addString(str: string): void {
    for (let i = 0; i < str.length; i++) {
      this.addByte(str.charCodeAt(i));
    }
  }

  private addUnicodeString(str: string): void {
    // Convert Unicode string to bytes
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    this.addBytes(Array.from(bytes));
  }

  // ============================================================
  // INITIALIZATION AND CONTROL
  // ============================================================

  /**
   * Initialize printer
   */
  initialize(): this {
    // ESC @
    this.addBytes([ESC, 0x40]);
    return this;
  }

  /**
   * Set character encoding
   */
  setEncoding(encoding: CharacterEncoding): this {
    this.encoding = encoding;
    // ESC t n - Select character code table
    this.addBytes([ESC, 0x74, ENCODING_TABLES[encoding]]);
    return this;
  }

  /**
   * Reset printer
   */
  reset(): this {
    this.buffer = [];
    return this.initialize();
  }

  // ============================================================
  // LINE SPACING
  // ============================================================

  /**
   * Set line spacing (in dots)
   */
  setLineSpacing(dots: number): this {
    if (dots < 0 || dots > 255) {
      throw new Error('Line spacing must be between 0 and 255');
    }
    // ESC 3 n
    this.addBytes([ESC, 0x33, dots]);
    return this;
  }

  /**
   * Set default line spacing
   */
  setDefaultLineSpacing(): this {
    // ESC 2
    this.addBytes([ESC, 0x32]);
    return this;
  }

  // ============================================================
  // TEXT FORMATTING
  // ============================================================

  /**
   * Set text format
   */
  setTextFormat(format: TextFormat): this {
    // ESC E n - Bold
    this.addBytes([ESC, 0x45, format.bold ? 1 : 0]);
    
    // ESC - n - Underline
    const underline = format.underline ? 1 : 0;
    this.addBytes([ESC, 0x2D, underline]);
    
    return this;
  }

  /**
   * Set bold on
   */
  boldOn(): this {
    // ESC E 1
    this.addBytes([ESC, 0x45, 1]);
    return this;
  }

  /**
   * Set bold off
   */
  boldOff(): this {
    // ESC E 0
    this.addBytes([ESC, 0x45, 0]);
    return this;
  }

  /**
   * Set underline on
   */
  underlineOn(): this {
    // ESC - 1
    this.addBytes([ESC, 0x2D, 1]);
    return this;
  }

  /**
   * Set underline off
   */
  underlineOff(): this {
    // ESC - 0
    this.addBytes([ESC, 0x2D, 0]);
    return this;
  }

  /**
   * Set double height on
   */
  doubleHeightOn(): this {
    // GS ! n - Select print mode
    // Bit 3 = double height
    this.addBytes([GS, 0x21, 0x10]);
    return this;
  }

  /**
   * Set double width on
   */
  doubleWidthOn(): this {
    // GS ! n - Select print mode
    // Bit 4 = double width
    this.addBytes([GS, 0x21, 0x20]);
    return this;
  }

  /**
   * Set double height and width off
   */
  doubleOff(): this {
    // GS ! 0
    this.addBytes([GS, 0x21, 0x00]);
    return this;
  }

  /**
   * Select font
   */
  setFont(font: 'a' | 'b' | 'c'): this {
    const fontMap = { 'a': 0, 'b': 1, 'c': 2 };
    // ESC M n
    this.addBytes([ESC, 0x4D, fontMap[font]]);
    return this;
  }

  /**
   * Set text color
   */
  setTextColor(color: 1 | 2): this {
    // ESC r n
    this.addBytes([ESC, 0x72, color === 1 ? 0 : 1]);
    return this;
  }

  // ============================================================
  // TEXT ALIGNMENT
  // ============================================================

  /**
   * Set alignment
   */
  setAlignment(alignment: 'left' | 'center' | 'right'): this {
    const alignMap = { 'left': 0, 'center': 1, 'right': 2 };
    // ESC a n
    this.addBytes([ESC, 0x61, alignMap[alignment]]);
    return this;
  }

  /**
   * Align left
   */
  alignLeft(): this {
    return this.setAlignment('left');
  }

  /**
   * Align center
   */
  alignCenter(): this {
    return this.setAlignment('center');
  }

  /**
   * Align right
   */
  alignRight(): this {
    return this.setAlignment('right');
  }

  // ============================================================
  // TEXT OUTPUT
  // ============================================================

  /**
   * Print text
   */
  text(text: string): this {
    if (this.encoding === 'UTF8') {
      this.addUnicodeString(text);
    } else {
      this.addString(text);
    }
    return this;
  }

  /**
   * Print text with format
   */
  textWithFormat(text: string, format: TextFormat): this {
    this.setTextFormat(format);
    this.text(text);
    // Reset format
    this.setTextFormat({ bold: false, underline: false });
    return this;
  }

  /**
   * Print text with automatic wrapping
   */
  textWrap(text: string, maxWidth: number, fontSize: number = 12): this {
    // Estimate characters that fit on one line
    // For 80mm paper at 12pt, approximately 48 characters fit
    const charsPerLine = Math.floor(maxWidth / (fontSize * 0.5));
    const lines = this.wrapText(text, charsPerLine);
    
    for (const line of lines) {
      this.text(line);
      this.newLine();
    }
    
    return this;
  }

  /**
   * Wrap text to fit width
   */
  private wrapText(text: string, maxChars: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length <= maxChars) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Print new line
   */
  newLine(): this {
    // LF
    this.addByte(NL);
    return this;
  }

  /**
   * Print multiple new lines
   */
  newLines(count: number): this {
    for (let i = 0; i < count; i++) {
      this.newLine();
    }
    return this;
  }

  // ============================================================
  // HORIZONTAL LINES
  // ============================================================

  /**
   * Print horizontal line (solid)
   */
  printHorizontalLine(width?: number): this {
    const chars = width || 48;
    let line = '';
    for (let i = 0; i < chars; i++) {
      line += '-';
    }
    this.text(line);
    this.newLine();
    return this;
  }

  /**
   * Print dashed line
   */
  printDashedLine(width?: number): this {
    const chars = width || 48;
    let line = '';
    for (let i = 0; i < chars; i++) {
      line += i % 2 === 0 ? '-' : ' ';
    }
    this.text(line);
    this.newLine();
    return this;
  }

  /**
   * Print double line
   */
  printDoubleLine(width?: number): this {
    const chars = width || 48;
    let line = '';
    for (let i = 0; i < chars; i++) {
      line += '=';
    }
    this.text(line);
    this.newLine();
    return this;
  }

  // ============================================================
  // TABS AND INDENT
  // ============================================================

  /**
   * Print horizontal tab
   */
  horizontalTab(): this {
    // HT
    this.addByte(0x09);
    return this;
  }

  /**
   * Set horizontal tab positions
   */
  setTabPositions(positions: number[]): this {
    // ESC D NUL ... NUL
    this.addBytes([ESC, 0x44]);
    for (const pos of positions) {
      this.addByte(pos);
    }
    this.addByte(0x00);
    return this;
  }

  /**
   * Set left margin
   */
  setLeftMargin(dots: number): this {
    // GS L nL nH
    const nL = dots & 0xFF;
    const nH = (dots >> 8) & 0xFF;
    this.addBytes([GS, 0x4C, nL, nH]);
    return this;
  }

  /**
   * Set print area width
   */
  setPrintAreaWidth(width: number): this {
    // GS W nL nH
    const nL = width & 0xFF;
    const nH = (width >> 8) & 0xFF;
    this.addBytes([GS, 0x57, nL, nH]);
    return this;
  }

  // ============================================================
  // BARCODE
  // ============================================================

  /**
   * Set barcode height (in dots)
   */
  setBarcodeHeight(height: number): this {
    // GS h n
    this.addBytes([GS, 0x68, height]);
    return this;
  }

  /**
   * Set barcode width (multiplier)
   */
  setBarcodeWidth(width: number): this {
    // GS w n
    if (width < 1 || width > 6) {
      throw new Error('Barcode width must be between 1 and 6');
    }
    this.addBytes([GS, 0x77, width]);
    return this;
  }

  /**
   * Set barcode text position
   */
  setBarcodeTextPosition(position: 'none' | 'above' | 'below' | 'both'): this {
    const posMap = { 'none': 0, 'above': 1, 'below': 2, 'both': 3 };
    // GS f n
    this.addBytes([GS, 0x66, posMap[position]]);
    return this;
  }

  /**
   * Print barcode (CODE128 as default)
   */
  printBarcode(data: string, type: BarcodeType = 'CODE128'): this {
    // QR is handled separately via printQRCode
    if (type === 'QR') {
      throw new Error('Use printQRCode() for QR codes');
    }

    const barcodeTypeMap: Record<Exclude<BarcodeType, 'QR'>, number> = {
      'UPC_A': 0,
      'UPC_E': 1,
      'EAN13': 2,
      'EAN8': 3,
      'CODE39': 4,
      'ITF': 5,
      'CODABAR': 6,
      'CODE93': 72,
      'CODE128': 73
    };

    const typeCode = barcodeTypeMap[type];
    
    if (type === 'CODE128') {
      // CODE128 requires special handling
      // GS k m n - Print barcode
      this.addBytes([GS, 0x6B, 0x00]); // CODE128
      
      // Add NUL to indicate automatic mode
      this.addByte(0x00);
      
      // Add data
      this.addString(data);
      this.addByte(0x00); // NUL terminator
    } else if (type === 'CODE39') {
      // CODE39 can include special characters
      this.addBytes([GS, 0x6B, 0x04]); // CODE39
      this.addString(data);
      this.addByte(0x00); // NUL terminator
    } else {
      // For other barcode types
      this.addBytes([GS, 0x6B, typeCode]);
      this.addString(data);
      this.addByte(0x00); // NUL terminator
    }

    this.newLine();
    return this;
  }

  /**
   * Print CODE128 barcode with proper handling
   */
  printBarcodeCode128(data: string): this {
    // For CODE128, we need to use manual mode
    // First, calculate the check digit
    const startCode = 0x7B; // CODE C start code
    const modeC = 0x7C; // CODE C mode
    
    // GS k m - Print barcode in specified mode
    // m = 0-6 for different barcode types, 73 for CODE128 in manual mode
    this.addBytes([GS, 0x6B, 73]); // CODE128 manual mode
    
    // Add data
    for (let i = 0; i < data.length; i++) {
      this.addByte(data.charCodeAt(i));
    }
    
    this.addByte(0x00); // NUL terminator
    this.newLine();
    
    return this;
  }

  // ============================================================
  // QR CODE
  // ============================================================

  /**
   * Print QR Code
   */
  printQRCode(
    data: string, 
    size: number = 6, 
    correction: QRErrorCorrection = 'M',
    model: QRModel = '2'
  ): this {
    // Model setting
    // GS ( k pL pH cn fn n
    const modelNum = model === '1' ? 1 : 2;
    this.addBytes([0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, modelNum, 0x00]);
    
    // Size setting (1-40)
    const sizeValue = Math.min(Math.max(size, 1), 40);
    this.addBytes([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, sizeValue]);
    
    // Error correction level setting
    const correctionMap: Record<QRErrorCorrection, number> = {
      'L': 0,
      'M': 1,
      'Q': 2,
      'H': 3
    };
    this.addBytes([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, correctionMap[correction]]);
    
    // Store data
    const dataBytes = this.encoding === 'UTF8' 
      ? Array.from(new TextEncoder().encode(data))
      : Array.from(data).map(c => c.charCodeAt(0));
    
    const dataLength = dataBytes.length + 3;
    const pL = dataLength & 0xFF;
    const pH = (dataLength >> 8) & 0xFF;
    
    this.addBytes([0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30]);
    this.addBytes(dataBytes);
    
    // Print QR code
    this.addBytes([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]);
    
    return this;
  }

  // ============================================================
  // BIT IMAGE PRINTING
  // ============================================================

  /**
   * Print bitmap image
   */
  printBitmap(
    width: number, 
    height: number, 
    bitmapData: number[],
    mode: 'normal' | 'double' | '4x' | '8x' = 'normal'
  ): this {
    const modeMap = { 'normal': 0, 'double': 1, '4x': 32, '8x': 33 };
    
    const m = modeMap[mode];
    const widthBytes = Math.ceil(width / 8);
    
    // v1 = height & 0xFF
    // v2 = (height >> 8) & 0xFF
    // v3 = widthBytes & 0xFF
    // v4 = (widthBytes >> 8) & 0xFF
    
    this.addBytes([GS, 0x76, 0x30, m]);
    this.addByte(widthBytes & 0xFF);
    this.addByte((widthBytes >> 8) & 0xFF);
    this.addByte(height & 0xFF);
    this.addByte((height >> 8) & 0xFF);
    
    this.addBytes(bitmapData);
    
    return this;
  }

  /**
   * Download and print NV bitmap logo
   */
  printNVBitmap(logoNumber: number): this {
    // FS p n m
    this.addBytes([FS, 0x70, logoNumber, 0x00]);
    return this;
  }

  // ============================================================
  // PAPER CUT
  // ============================================================

  /**
   * Cut paper (full cut)
   */
  cutPaper(): this {
    // GS V m
    this.addBytes([GS, 0x56, 0x00]);
    return this;
  }

  /**
   * Cut paper (partial cut)
   */
  cutPaperPartial(): this {
    // GS V m
    this.addBytes([GS, 0x56, 0x01]);
    return this;
  }

  /**
   * Cut paper with feed
   */
  cutPaperWithFeed(lines: number = 3): this {
    // GS V m n
    this.addBytes([GS, 0x56, 0x01, lines]);
    return this;
  }

  // ============================================================
  // CASH DRAWER
  // ============================================================

  /**
   * Open cash drawer
   */
  openCashDrawer(): this {
    // ESC p m t1 t2
    // m = 0 (pin 2) or 1 (pin 5)
    // t1 = on time (2 = 50ms)
    // t2 = off time (2 = 200ms)
    this.addBytes([ESC, 0x70, 0x00, 0x19, 0xFA]);
    return this;
  }

  /**
   * Open cash drawer (alternative pin)
   */
  openCashDrawerPin2(): this {
    this.addBytes([ESC, 0x70, 0x00, 0x19, 0xFA]);
    return this;
  }

  /**
   * Open cash drawer (pin 5)
   */
  openCashDrawerPin5(): this {
    this.addBytes([ESC, 0x70, 0x01, 0x19, 0xFA]);
    return this;
  }

  // ============================================================
  // BUZZER
  // ============================================================

  /**
   * Beep
   */
  beep(times: number = 1, interval: number = 200): this {
    // ESC B n t
    const n = Math.min(Math.max(times, 1), 20);
    const t = Math.min(Math.max(interval / 50, 1), 20);
    this.addBytes([ESC, 0x42, n, t]);
    return this;
  }

  // ============================================================
  // STATUS
  // ============================================================

  /**
   * Request printer status
   */
  getStatus(): this {
    // DLE EOT n - Real-time status request
    // n = 1: Printer
    // n = 2: Offline cause
    // n = 3: Error cause
    // n = 4: Paper roll
    this.addBytes([DLE, 0x04, 0x01]);
    return this;
  }

  /**
   * Get paper sensor status
   */
  getPaperStatus(): this {
    this.addBytes([DLE, 0x04, 0x04]);
    return this;
  }

  // ============================================================
  // FEED AND PRINT POSITION
  // ============================================================

  /**
   * Print and feed lines
   */
  printAndFeed(lines: number): this {
    // ESC d n
    this.addBytes([ESC, 0x64, lines]);
    return this;
  }

  /**
   * Print and feed to black mark
   */
  printAndFeedToMark(): this {
    // ESC b n - Feed to print position
    this.addBytes([ESC, 0x62, 0x00]);
    return this;
  }

  /**
   * Return to line start
   */
  returnToLineStart(): this {
    // CR
    this.addByte(CR);
    return this;
  }

  // ============================================================
  // PARTIAL CUT MARK
  // ============================================================

  /**
   * Set partial cut mark
   */
  setPartialCutMark(): this {
    // GS V 1
    this.addBytes([GS, 0x56, 0x01]);
    return this;
  }

  // ============================================================
  // PAGE MODE
  // ============================================================

  /**
   * Enter page mode
   */
  enterPageMode(): this {
    // ESC L
    this.addBytes([ESC, 0x4C]);
    return this;
  }

  /**
   * Exit page mode
   */
  exitPageMode(): this {
    // ESC S
    this.addBytes([ESC, 0x53]);
    return this;
  }

  /**
   * Set print area in page mode
   */
  setPrintArea(x: number, y: number, width: number, height: number): this {
    // ESC W xL xH yL yH wL wH hL hH
    const xL = x & 0xFF;
    const xH = (x >> 8) & 0xFF;
    const yL = y & 0xFF;
    const yH = (y >> 8) & 0xFF;
    const wL = width & 0xFF;
    const wH = (width >> 8) & 0xFF;
    const hL = height & 0xFF;
    const hH = (height >> 8) & 0xFF;
    
    this.addBytes([ESC, 0x57, xL, xH, yL, yH, wL, wH, hL, hH]);
    return this;
  }

  /**
   * Set absolute print position in page mode
   */
  setAbsolutePosition(x: number, y: number): this {
    // ESC $ xL xH yL yH
    const xL = x & 0xFF;
    const xH = (x >> 8) & 0xFF;
    const yL = y & 0xFF;
    const yH = (y >> 8) & 0xFF;
    
    this.addBytes([ESC, 0x24, xL, xH, yL, yH]);
    return this;
  }

  // ============================================================
  // SERIAL CRYSTAL DISPLAY
  // ============================================================

  /**
   * Initialize display
   */
  initDisplay(): this {
    // ESC @ (initialize)
    this.addBytes([ESC, 0x40]);
    return this;
  }

  /**
   * Clear display
   */
  clearDisplay(): this {
    // ESC LE
    this.addBytes([ESC, 0x4C, 0x45]);
    return this;
  }

  /**
   * Set display cursor
   */
  setCursor(visible: boolean): this {
    // ESC 0 n
    this.addBytes([ESC, 0x30, visible ? 1 : 0]);
    return this;
  }

  // ============================================================
  // OUTPUT
  // ============================================================

  /**
   * Get buffer as Uint8Array
   */
  toBuffer(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  /**
   * Get buffer as base64 string
   */
  toBase64(): string {
    const buffer = this.toBuffer();
    let binary = '';
    for (let i = 0; i < buffer.length; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
  }

  /**
   * Get buffer as hex string
   */
  toHex(): string {
    return Array.from(this.buffer)
      .map(b => b.toString(16).padStart(2, '0'))
      .join(' ');
  }

  /**
   * Clear buffer
   */
  clear(): this {
    this.buffer = [];
    return this;
  }

  /**
   * Get buffer length
   */
  getLength(): number {
    return this.buffer.length;
  }

  // ============================================================
  // CONVENIENCE METHODS FOR RECEIPTS
  // ============================================================

  /**
   * Print receipt header with business info
   */
  printReceiptHeader(info: {
    logo?: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    kraPin?: string;
  }): this {
    this.alignCenter();
    
    if (info.name) {
      this.boldOn();
      this.text(info.name);
      this.boldOff();
      this.newLine();
    }
    
    if (info.address) {
      this.text(info.address);
      this.newLine();
    }
    
    if (info.phone) {
      this.text(info.phone);
      this.newLine();
    }
    
    if (info.email) {
      this.text(info.email);
      this.newLine();
    }
    
    if (info.kraPin) {
      this.text(`PIN: ${info.kraPin}`);
      this.newLine();
    }
    
    this.printHorizontalLine();
    this.alignLeft();
    
    return this;
  }

  /**
   * Print receipt footer
   */
  printReceiptFooter(message: string): this {
    this.alignCenter();
    this.printHorizontalLine();
    this.text(message);
    this.newLine();
    this.alignLeft();
    
    return this;
  }

  /**
   * Print receipt item line
   */
  printItemLine(item: {
    name: string;
    quantity: number;
    price: string;
    total: string;
  }, maxWidth: number = 48): this {
    // Format: Item Name............Qty x Price = Total
    const nameMaxLen = maxWidth - 20;
    const name = item.name.length > nameMaxLen 
      ? item.name.substring(0, nameMaxLen - 2) + '..' 
      : item.name;
    
    const dots = maxWidth - name.length - item.total.length - 4;
    const dotStr = '.'.repeat(Math.max(dots, 1));
    
    this.text(name);
    this.text(dotStr);
    this.text(item.total);
    this.newLine();
    
    // Print quantity and price on next line
    this.text(`   ${item.quantity} x ${item.price}`);
    this.newLine();
    
    return this;
  }

  /**
   * Print totals section
   */
  printTotals(lines: Array<{ label: string; value: string; bold?: boolean }>): this {
    this.printDashedLine();
    
    for (const line of lines) {
      if (line.bold) {
        this.boldOn();
      }
      
      const spaces = 48 - line.label.length - line.value.length;
      const spaceStr = ' '.repeat(Math.max(spaces, 1));
      
      this.text(line.label);
      this.text(spaceStr);
      this.text(line.value);
      this.newLine();
      
      if (line.bold) {
        this.boldOff();
      }
    }
    
    return this;
  }
}

// ============================================================
// FACTORY FUNCTION
// ============================================================

export function createESCPOSGenerator(options?: { 
  encoding?: CharacterEncoding; 
  model?: PrinterModel 
}): ESCPOSGenerator {
  return new ESCPOSGenerator(options);
}

export default ESCPOSGenerator;
