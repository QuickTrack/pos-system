// ============================================================
// PDF GENERATION MODULE
// Generates PDF documents for printing
// ============================================================

import { 
  PrintableTemplate, 
  PrintDataContext, 
  PrintableElement,
  PaperSize,
  DocumentType,
  PDFGenerationError 
} from './types';

// Simple PDF generation without external dependencies
// For production, consider using jsPDF or pdfkit

export class PDFGenerator {
  private pageWidth: number;
  private pageHeight: number;
  private currentY: number = 0;
  private contentWidth: number;
  private marginLeft: number;
  private marginTop: number;
  private elements: PrintableElement[];
  private data: PrintDataContext;
  private fontSize: number = 12;
  private fontFamily: string = 'Helvetica';
  private bold: boolean = false;
  private alignment: 'left' | 'center' | 'right' = 'left';
  
  // PDF building blocks
  private pdfContent: string[] = [];
  private objectCount: number = 0;
  private fontObjectRefs: string[] = [];
  
  // Colors
  private currentColor: string = '#000000';
  private currentFillColor: string = '#FFFFFF';

  constructor(options: {
    template: PrintableTemplate;
    data: PrintDataContext;
  }) {
    const { template, data } = options;
    
    this.elements = template.elements;
    this.data = data;
    
    const dimensions = this.getPageDimensions(template.pageSize);
    
    this.pageWidth = template.orientation === 'landscape' ? dimensions.height : dimensions.width;
    this.pageHeight = template.orientation === 'landscape' ? dimensions.width : dimensions.height;
    this.marginLeft = template.margins.left;
    this.marginTop = template.margins.top;
    this.contentWidth = this.pageWidth - template.margins.left - template.margins.right;
    this.currentY = template.margins.top;
  }

  /**
   * Get page dimensions in points (1mm = 2.83pt)
   */
  private getPageDimensions(paperSize: PaperSize): { width: number; height: number } {
    const mmToPt = 2.8346;
    const sizes: Record<PaperSize, { width: number; height: number }> = {
      '58mm': { width: 58 * mmToPt, height: 297 * mmToPt }, // Continuous
      '80mm': { width: 80 * mmToPt, height: 297 * mmToPt }, // Continuous
      'A4': { width: 210 * mmToPt, height: 297 * mmToPt },
      'A4_LANDSCAPE': { width: 297 * mmToPt, height: 210 * mmToPt },
      'HALF_PAGE': { width: 210 * mmToPt, height: 148 * mmToPt },
      'CUSTOM': { width: 210 * mmToPt, height: 297 * mmToPt }
    };
    return sizes[paperSize] || sizes['A4'];
  }

  /**
   * Generate PDF
   */
  generate(): string {
    try {
      this.buildHeader();
      this.buildPages();
      this.buildTrailer();
      return this.buildPDFDocument();
    } catch (error) {
      throw new PDFGenerationError('Failed to generate PDF', { error });
    }
  }

  /**
   * Build PDF header
   */
  private buildHeader(): void {
    // Add PDF magic number - standard PDF 1.4 header
    this.pdfContent.push('%PDF-1.4');
    // Add binary marker bytes to ensure PDF viewer treats file as binary
    // This is the standard approach for PDF files
    this.pdfContent.push('%' + String.fromCharCode(0xE2, 0xE3, 0xCF, 0xD3));
    // Add newline
    this.pdfContent.push('');
    
    // Create Catalog object (object 1) - this is the root object
    this.pdfContent.push('1 0 obj');
    this.pdfContent.push('<<');
    this.pdfContent.push('/Type /Catalog');
    this.pdfContent.push('/Pages 2 0 R');
    this.pdfContent.push('>>');
    this.pdfContent.push('endobj');
    
    // Create Pages object (object 2) - will be filled in by startPage
    this.pdfContent.push('2 0 obj');
    this.pdfContent.push('<<');
    this.pdfContent.push('/Type /Pages');
    this.pdfContent.push('/Kids []');
    this.pdfContent.push('/Count 0');
    this.pdfContent.push('>>');
    this.pdfContent.push('endobj');
    
    // Set object count to 2 since we created objects 1 and 2
    this.objectCount = 2;
    
    // Font objects start from object 3
    this.fontObjectRefs = this.addFont('Helvetica');
    this.fontObjectRefs = this.addFont('Helvetica-Bold');
  }

  /**
   * Add font to PDF
   */
  private addFont(fontName: string): string[] {
    const ref = `${++this.objectCount} 0 obj`;
    this.pdfContent.push(ref);
    this.pdfContent.push('<<');
    this.pdfContent.push('/Type /Font');
    this.pdfContent.push('/Subtype /Type1');
    this.pdfContent.push('/BaseFont /' + fontName.replace('-', ''));
    this.pdfContent.push('>>');
    this.pdfContent.push('endobj');
    return [ref];
  }

  /**
   * Build pages
   */
  private buildPages(): void {
    // Process elements
    let pageStarted = false;
    let contentBuffer: string[] = [];
    
    for (const element of this.elements) {
      const processedElement = this.processElement(element);
      
      if (!pageStarted) {
        this.startPage();
        pageStarted = true;
      }
      
      // Check if we need a new page
      if (this.currentY + (element.height || 20) > this.pageHeight - this.getMargins().bottom) {
        this.endPage(contentBuffer);
        this.startPage();
        contentBuffer = [];
      }
      
      // Add element to content
      const rendered = this.renderElement(processedElement);
      contentBuffer.push(...rendered);
      this.currentY += (element.height || 20);
    }
    
    if (pageStarted) {
      this.endPage(contentBuffer);
    }
  }

  /**
   * Process element (bind data)
   */
  private processElement(element: PrintableElement): PrintableElement {
    if (!element.content && !element.src) {
      return element;
    }
    
    const processed = { ...element };
    
    if (processed.content) {
      processed.content = this.bindData(processed.content);
    }
    
    return processed;
  }

  /**
   * Bind data to template
   */
  private bindData(template: string): string {
    let result = template;
    
    // Replace all {{key}} patterns
    const regex = /\{\{([^}]+)\}\}/g;
    result = result.replace(regex, (match, key) => {
      const keys = key.split('.');
      let value: any = this.data;
      
      for (const k of keys) {
        if (value && typeof value === 'object') {
          value = value[k];
        } else {
          return match;
        }
      }
      
      return value !== undefined ? String(value) : match;
    });
    
    return result;
  }

  /**
   * Start a new page
   */
  private startPage(): void {
    this.objectCount++;
    // Object 2 is already created as Pages, so subsequent pages start from 3
    const pageRef = `${this.objectCount} 0 obj`;
    const pagesRef = '2 0 R';
    
    this.pdfContent.push(pageRef);
    this.pdfContent.push('<<');
    this.pdfContent.push('/Type /Page');
    this.pdfContent.push(`/MediaBox [0 0 ${this.pageWidth} ${this.pageHeight}]`);
    this.pdfContent.push('/Parent 1 0 R');
    this.pdfContent.push('/Resources');
    this.pdfContent.push('<<');
    this.pdfContent.push('/Font');
    this.pdfContent.push('<<');
    this.pdfContent.push('/F1 2 0 R');
    this.pdfContent.push('/F2 3 0 R');
    this.pdfContent.push('>>');
    this.pdfContent.push('>>');
    this.pdfContent.push('/Contents 4 0 R'); // Will be updated
    this.pdfContent.push('>>');
    this.pdfContent.push('endobj');
    
    this.currentY = this.marginTop;
  }

  /**
   * End current page
   */
  private endPage(content: string[]): void {
    this.objectCount++;
    const contentRef = `${this.objectCount} 0 obj`;
    
    const stream = content.join('\n');
    const encodedStream = this.encodeStream(stream);
    
    this.pdfContent.push(contentRef);
    this.pdfContent.push('<<');
    this.pdfContent.push('/Length ' + encodedStream.length);
    this.pdfContent.push('>>');
    this.pdfContent.push('stream');
    this.pdfContent.push(encodedStream);
    this.pdfContent.push('endstream');
    this.pdfContent.push('endobj');
  }

  /**
   * Encode stream content
   */
  private encodeStream(content: string): string {
    // Simple ASCII encoding (for production, use proper compression)
    return content;
  }

  /**
   * Render element to PDF content
   */
  private renderElement(element: PrintableElement): string[] {
    const lines: string[] = [];
    // Use element's absolute y position (from top of page), convert to points
    // PDF uses bottom-up coordinates, but we pass top-down to renderText which converts
    const x = this.convertMmToPt(this.marginLeft + (element.x || 0));
    const y = this.convertMmToPt(element.y || 0); // y is from top of page
    
    switch (element.type) {
      case 'text':
        lines.push(...this.renderText(element, x, y));
        break;
      case 'divider':
        lines.push(...this.renderDivider(element, x, y));
        break;
      case 'table':
        lines.push(...this.renderTable(element, x, y));
        break;
      case 'image':
        // Images would need image data handling
        break;
      case 'qrcode':
        lines.push(...this.renderQRCode(element, x, y));
        break;
      case 'barcode':
        lines.push(...this.renderBarcode(element, x, y));
        break;
      case 'shape':
        lines.push(...this.renderShape(element, x, y));
        break;
      case 'spacer':
        // Spacer adds space but no output
        break;
    }
    
    return lines;
  }

  /**
   * Render text element
   */
  private renderText(element: PrintableElement, x: number, y: number): string[] {
    const lines: string[] = [];
    const font = element.fontWeight === 'bold' ? '/F2' : '/F1';
    const size = element.fontSize || 12;
    const color = this.rgbToPdfColor(element.color || '#000000');
    
    // Calculate text position based on alignment
    let textX = x;
    const textWidth = this.convertMmToPt(element.width || 80);
    
    if (element.textAlign === 'center') {
      // For center alignment, we need to calculate position
      textX = x + textWidth / 2;
    } else if (element.textAlign === 'right') {
      textX = x + textWidth;
    }
    
    // Handle multi-line content
    const content = element.content || '';
    const textLines = content.split('\n');
    
    for (let i = 0; i < textLines.length; i++) {
      const lineY = y + (i * size * 1.2);
      const text = this.escapePdfString(textLines[i]);
      
      let textOp = `BT`;
      textOp += ` ${font} ${size} Tf`;
      textOp += ` ${color} rg`;
      textOp += ` ${textX} ${this.pageHeight - lineY} Td`;
      
      if (element.textAlign === 'center') {
        textOp += ` (${text}) Tj`;
      } else if (element.textAlign === 'right') {
        textOp += ` (${text}) Tj`;
      } else {
        textOp += ` (${text}) Tj`;
      }
      
      textOp += ' ET';
      lines.push(textOp);
    }
    
    return lines;
  }

  /**
   * Render divider
   */
  private renderDivider(element: PrintableElement, x: number, y: number): string[] {
    const lines: string[] = [];
    const width = this.convertMmToPt(element.width || this.contentWidth);
    const lineY = this.pageHeight - y;
    
    if (element.lineStyle === 'dashed') {
      // Dashed line
      const dashArray = [3, 3];
      lines.push(
        `q`,
        `[] 0 d`,
        `1 J`,
        `0.5 w`,
        `${x} ${lineY} m`,
        `${x + width} ${lineY} l`,
        `S`,
        `Q`
      );
    } else if (element.lineStyle === 'dotted') {
      lines.push(
        `q`,
        `[1 2] 0 d`,
        `0.5 w`,
        `${x} ${lineY} m`,
        `${x + width} ${lineY} l`,
        `S`,
        `Q`
      );
    } else {
      // Solid line
      lines.push(
        `q`,
        `1 J`,
        `0.5 w`,
        `${x} ${lineY} m`,
        `${x + width} ${lineY} l`,
        `S`,
        `Q`
      );
    }
    
    return lines;
  }

  /**
   * Render table
   */
  private renderTable(element: PrintableElement, x: number, y: number): string[] {
    const lines: string[] = [];
    const columns = element.columns || [];
    const tableWidth = this.convertMmToPt(element.width || this.contentWidth);
    
    // Get items from data source
    const items = this.getTableData(element.source || 'items');
    const rowHeight = (element.fontSize || 10) * 1.5;
    
    // Draw header
    let currentX = x;
    const headerY = this.pageHeight - y;
    
    for (const col of columns) {
      const colWidth = this.convertMmToPt(col.width || tableWidth / columns.length);
      const colAlign = col.align || 'left';
      
      // Header background
      lines.push(
        `q`,
        `0.9 g`,
        `${currentX} ${headerY - rowHeight} ${colWidth} ${rowHeight} re`,
        `f`,
        `Q`
      );
      
      // Header text
      const textX = colAlign === 'center' ? currentX + colWidth / 2 :
                    colAlign === 'right' ? currentX + colWidth - 2 : currentX + 2;
      
      lines.push(
        `BT`,
        `/F2 ${element.fontSize || 10} Tf`,
        `${textX} ${headerY - rowHeight + 3} Td`,
        `(${this.escapePdfString(col.title)}) Tj`,
        `ET`
      );
      
      currentX += colWidth;
    }
    
    // Draw rows
    let rowY = headerY;
    
    for (const item of items) {
      rowY -= rowHeight;
      currentX = x;
      
      for (const col of columns) {
        const colWidth = this.convertMmToPt(col.width || tableWidth / columns.length);
        const colAlign = col.align || 'left';
        const value = String(item[col.key] || '');
        
        const textX = colAlign === 'center' ? currentX + colWidth / 2 :
                      colAlign === 'right' ? currentX + colWidth - 2 : currentX + 2;
        
        lines.push(
          `BT`,
          `/F1 ${element.fontSize || 10} Tf`,
          `${textX} ${rowY + 3} Td`,
          `(${this.escapePdfString(value)}) Tj`,
          `ET`
        );
        
        currentX += colWidth;
      }
    }
    
    return lines;
  }

  /**
   * Get table data from source
   */
  private getTableData(source: string): any[] {
    const data = this.data as any;
    const sourceData = data[source];
    
    if (Array.isArray(sourceData)) {
      return sourceData;
    }
    
    return data.items || [];
  }

  /**
   * Render QR code placeholder
   */
  private renderQRCode(element: PrintableElement, x: number, y: number): string[] {
    // QR codes need image data - placeholder
    const lines: string[] = [];
    const size = this.convertMmToPt(element.width || 20);
    const qrY = this.pageHeight - y - size;
    
    // Placeholder rectangle
    lines.push(
      `q`,
      `0.5 w`,
      `${x} ${qrY} ${size} ${size} re`,
      `S`,
      `Q`
    );
    
    // Add text showing QR data
    const content = element.content || 'QR';
    lines.push(
      `BT`,
      `/F1 6 Tf`,
      `${x + 2} ${qrY + size / 2} Td`,
      `(${this.escapePdfString(content.substring(0, 20))}) Tj`,
      `ET`
    );
    
    return lines;
  }

  /**
   * Render barcode placeholder
   */
  private renderBarcode(element: PrintableElement, x: number, y: number): string[] {
    const lines: string[] = [];
    const width = this.convertMmToPt(element.width || 60);
    const height = this.convertMmToPt(element.height || 15);
    const barcodeY = this.pageHeight - y - height;
    
    // Placeholder rectangle for barcode
    lines.push(
      `q`,
      `0.3 w`,
      `${x} ${barcodeY + height - 3} ${width} 3 re`,
      `S`,
      `Q`
    );
    
    // Add barcode number
    const content = element.content || '';
    lines.push(
      `BT`,
      `/F1 8 Tf`,
      `${x + width / 2} ${barcodeY - 2} Td`,
      `(${this.escapePdfString(content)}) Tj`,
      `ET`
    );
    
    return lines;
  }

  /**
   * Render shape
   */
  private renderShape(element: PrintableElement, x: number, y: number): string[] {
    const lines: string[] = [];
    const width = this.convertMmToPt(element.width || 10);
    const height = this.convertMmToPt(element.height || 10);
    const shapeY = this.pageHeight - y - height;
    const color = element.backgroundColor || '#FFFFFF';
    const pdfColor = this.rgbToPdfColor(color);
    
    if (element.shapeType === 'rectangle') {
      lines.push(
        `q`,
        `${pdfColor} rg`,
        `${x} ${shapeY} ${width} ${height} re`,
        `f`,
        `Q`
      );
    } else if (element.shapeType === 'line') {
      lines.push(
        `q`,
        `0.5 w`,
        `${x} ${shapeY + height / 2} m`,
        `${x + width} ${shapeY + height / 2} l`,
        `S`,
        `Q`
      );
    }
    
    return lines;
  }

  /**
   * Build PDF trailer
   */
  private buildTrailer(): void {
    const xrefOffset = this.pdfContent.join('\n').length + 1;
    
    this.pdfContent.push('xref');
    this.pdfContent.push(`0 ${this.objectCount + 1}`);
    this.pdfContent.push('0000000000 65535 f ');
    
    for (let i = 1; i <= this.objectCount; i++) {
      const offset = this.pdfContent.slice(0, i).join('\n').length + i + 1;
      this.pdfContent.push(`${offset.toString().padStart(10, '0')} 00000 n `);
    }
    
    this.pdfContent.push('trailer');
    this.pdfContent.push('<<');
    this.pdfContent.push(`/Size ${this.objectCount + 1}`);
    // Root should reference the Catalog (object 1)
    this.pdfContent.push('/Root 1 0 R');
    this.pdfContent.push('>>');
    this.pdfContent.push('startxref');
    this.pdfContent.push(xrefOffset.toString());
    this.pdfContent.push('%%EOF');
  }

  /**
   * Build final PDF document
   */
  private buildPDFDocument(): string {
    return this.pdfContent.join('\n');
  }

  /**
   * Convert mm to points
   */
  private convertMmToPt(mm: number): number {
    return mm * 2.8346;
  }

  /**
   * Get margins
   */
  private getMargins(): { top: number; bottom: number } {
    return { top: this.marginTop, bottom: 10 };
  }

  /**
   * Convert RGB to PDF color
   */
  private rgbToPdfColor(color: string): string {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;
  }

  /**
   * Escape PDF string
   */
  private escapePdfString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  }
}

// ============================================================
// FACTORY FUNCTION
// ============================================================

export function generatePDF(
  template: PrintableTemplate,
  data: PrintDataContext
): string {
  const generator = new PDFGenerator({ template, data });
  return generator.generate();
}

export default PDFGenerator;
