// ============================================================
// PDF GENERATION MODULE
// Generates PDF documents for printing using jsPDF
// ============================================================

import { jsPDF } from 'jspdf';
import { 
  PrintableTemplate, 
  PrintDataContext, 
  PrintableElement,
  PaperSize,
  PDFGenerationError 
} from './types';

export class PDFGenerator {
  private doc: jsPDF;
  private data: PrintDataContext;
  private elements: PrintableElement[];
  private marginLeft: number;
  private marginTop: number;

  constructor(options: {
    template: PrintableTemplate;
    data: PrintDataContext;
  }) {
    const { template, data } = options;
    this.data = data;
    this.elements = template.elements;
    this.marginLeft = template.margins?.left || 0;
    this.marginTop = template.margins?.top || 0;

    const dimensions = this.getPageDimensions(template.pageSize);
    const orientation = template.orientation || 'portrait';
    
    // For A4/A4_LANDSCAPE use built-in formats, otherwise use custom dimensions
    if (template.pageSize === 'A4' || template.pageSize === 'A4_LANDSCAPE') {
      this.doc = new jsPDF({
        unit: 'mm',
        format: template.pageSize === 'A4_LANDSCAPE' ? 'a4' : 'a4',
        orientation
      });
    } else {
      this.doc = new jsPDF({
        unit: 'mm',
        format: [dimensions.width, dimensions.height],
        orientation
      });
    }
  }

  private getPageDimensions(paperSize: PaperSize): { width: number; height: number } {
    const sizes: Record<PaperSize, { width: number; height: number }> = {
      '58mm': { width: 58, height: 297 },
      '80mm': { width: 80, height: 297 },
      'A4': { width: 210, height: 297 },
      'A4_LANDSCAPE': { width: 297, height: 210 },
      'HALF_PAGE': { width: 210, height: 148 },
      'CUSTOM': { width: 210, height: 297 }
    };
    return sizes[paperSize] || sizes['A4'];
  }

generate(): Uint8Array {
    try {
      console.log('[PDFGenerator] Starting render, elements:', this.elements.length);
      this.renderElements();
      
      // Add a simple footer to ensure PDF has content
      this.doc.setFontSize(8);
      this.doc.text('Generated: ' + new Date().toISOString(), this.marginLeft, 285);

      // Get PDF output - jspdf 2.5.2 supports datauristring
      const dataUri = this.doc.output('datauristring');
      if (!dataUri) {
        throw new PDFGenerationError('Failed to generate PDF output - null dataUri');
      }

      // Verify PDF header
      if (!dataUri.startsWith('data:application/pdf')) {
        console.error('[PDFGenerator] Invalid data URI format:', dataUri.substring(0, 50));
        throw new PDFGenerationError('Generated output is not a valid PDF');
      }

      // Extract base64 part and convert to Uint8Array using Node.js Buffer
      const base64 = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;
      const buffer = Buffer.from(base64, 'base64');

      // Verify we got actual PDF content
      const header = buffer.slice(0, 4).toString('binary');
      if (header !== '%PDF') {
        console.error('[PDFGenerator] Invalid PDF header:', header);
        throw new PDFGenerationError('Generated PDF has invalid header: ' + header);
      }

      console.log('[PDFGenerator] Generated valid PDF:', { 
        length: buffer.length, 
        pageSize: this.doc.internal.pageSize.getWidth() + 'x' + this.doc.internal.pageSize.getHeight() 
      });

      return new Uint8Array(buffer);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[PDFGenerator] Generation error:', error);
      throw new PDFGenerationError('Failed to generate PDF: ' + msg, { error });
    }
  }

  private renderElements(): void {
    for (const element of this.elements) {
      this.renderElement(element);
    }
  }

  private processElement(element: PrintableElement): PrintableElement {
    const processed = { ...element };
    if (processed.content) {
      processed.content = this.bindData(processed.content);
    }
    return processed;
  }

  private bindData(template: string): string {
    let result = template;
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
      return value !== undefined && value !== null ? String(value) : match;
    });
    return result;
  }

  private renderElement(element: PrintableElement): void {
    const processedElement = this.processElement(element);
    // Apply margins offset
    const x = processedElement.x + this.marginLeft;
    const y = processedElement.y + this.marginTop;

    switch (processedElement.type) {
      case 'text':
        this.renderText(processedElement, x, y);
        break;
      case 'divider':
        this.renderDivider(processedElement, x, y);
        break;
      case 'table':
        this.renderTable(processedElement, x, y);
        break;
      case 'qrcode':
        this.renderQRCode(processedElement, x, y);
        break;
      case 'barcode':
        this.renderBarcode(processedElement, x, y);
        break;
      case 'shape':
        this.renderShape(processedElement, x, y);
        break;
    }
  }

  private renderText(element: PrintableElement, x: number, y: number): void {
    const content = element.content || '';
    const fontSize = element.fontSize || 12;

    if (element.fontWeight === 'bold') {
      this.doc.setFont('helvetica', 'bold');
    } else {
      this.doc.setFont('helvetica', 'normal');
    }

    this.doc.setFontSize(fontSize);

    const lines = content.split('\n');
    const lineHeight = fontSize * 1.2;

    for (let i = 0; i < lines.length; i++) {
      const lineY = y + (i * lineHeight);
      const textX = element.textAlign === 'center' ? x + (element.width || 200) / 2 :
                    element.textAlign === 'right' ? x + (element.width || 200) : x;

      if (element.textAlign === 'center' || element.textAlign === 'right') {
        this.doc.text(lines[i], textX, lineY, { align: element.textAlign });
      } else {
        this.doc.text(lines[i], textX, lineY);
      }
    }
  }

  private renderDivider(element: PrintableElement, x: number, y: number): void {
    this.doc.setLineWidth(0.5);
    this.doc.line(x, y, x + (element.width || 500), y);
  }

  private renderTable(element: PrintableElement, x: number, y: number): void {
    const columns = element.columns || [];
    const source = element.source || 'items';
    const items = this.getTableData(source);
    const rowHeight = (element.fontSize || 10) * 1.5;

    console.log('[PDFGenerator] Table render:', { source, itemsCount: items.length, columnsCount: columns.length });

    let currentY = y;

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(element.fontSize || 10);

    let currentX = x;
    for (const col of columns) {
      this.doc.text(col.title, currentX, currentY);
      currentX += (col.width || 100);
    }

    currentY += rowHeight;

    this.doc.setFont('helvetica', 'normal');

    for (const item of items) {
      currentX = x;
      for (const col of columns) {
        const value = String(item[col.key] || '');
        if (col.align === 'right') {
          const textWidth = this.doc.getTextWidth(value);
          const colEndX = currentX + (col.width || 100);
          this.doc.text(value, colEndX - textWidth, currentY);
        } else {
          this.doc.text(value, currentX, currentY);
        }
        currentX += (col.width || 100);
      }
      currentY += rowHeight;
    }
  }

  private getTableData(source: string): any[] {
    const sourceData = (this.data as any)[source];
    if (Array.isArray(sourceData)) {
      return sourceData;
    }
    return (this.data as any).items || [];
  }

  private renderQRCode(element: PrintableElement, x: number, y: number): void {
    const content = element.content || '';
    const size = element.width || element.height || 20;
    this.doc.setDrawColor(0);
    this.doc.rect(x, y, size, size);
    this.doc.setFontSize(6);
    this.doc.text(content.substring(0, 20), x + 2, y + size / 2);
  }

  private renderBarcode(element: PrintableElement, x: number, y: number): void {
    const width = element.width || 60;
    const height = element.height || 15;
    this.doc.setDrawColor(0);
    this.doc.rect(x, y, width, height);
  }

  private renderShape(element: PrintableElement, x: number, y: number): void {
    if (element.shapeType === 'rectangle') {
      this.doc.setFillColor(element.backgroundColor || '#FFFFFF');
      this.doc.rect(x, y, element.width || 10, element.height || 10, 'F');
    }
  }
}

export function generatePDF(
  template: PrintableTemplate,
  data: PrintDataContext
): Uint8Array {
  const generator = new PDFGenerator({ template, data });
  return generator.generate();
}

export default PDFGenerator;