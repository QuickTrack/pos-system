// ============================================================
// TEMPLATE RENDERING ENGINE
// Renders document templates to ESC/POS or PDF output
// ============================================================

import { 
  PrintableTemplate, 
  PrintDataContext, 
  PrintableElement, 
  OutputFormat,
  PaperSize,
  CharacterEncoding,
  TemplateRenderError 
} from './types';
import { ESCPOSGenerator } from './escpos-generator';
import { generateQRCode, generateBarcode } from './barcode-generator';
import { generatePDF } from './pdf-generator';
import { QRErrorCorrection } from './types';

export class TemplateEngine {
  private template: PrintableTemplate;
  private data: PrintDataContext;
  private encoding: CharacterEncoding;

  constructor(options: {
    template: PrintableTemplate;
    data: PrintDataContext;
    encoding?: CharacterEncoding;
  }) {
    this.template = options.template;
    this.data = options.data;
    this.encoding = options.encoding || 'PC437';
  }

  /**
   * Render template to specified format
   */
  render(format: OutputFormat): Uint8Array | string {
    switch (format) {
      case 'escpos':
        return this.renderToESCPOS();
      case 'pdf':
        return this.renderToPDF();
      case 'raw':
        return this.renderToESCPOS();
      default:
        throw new TemplateRenderError(`Unsupported format: ${format}`);
    }
  }

  /**
   * Render to ESC/POS commands
   */
  renderToESCPOS(): Uint8Array {
    const generator = new ESCPOSGenerator({ encoding: this.encoding });
    
    // Initialize printer
    generator.initialize();
    generator.setEncoding(this.encoding);

    // Process elements in order
    for (const element of this.template.elements) {
      try {
        this.processElement(element, generator);
      } catch (error) {
        // Continue with other elements
      }
    }

    // Cut paper
    generator.cutPaper();

    return generator.toBuffer();
  }

  /**
   * Process individual element
   */
  private processElement(element: PrintableElement, generator: ESCPOSGenerator): void {
    // Bind data to element
    const processedElement = this.bindDataToElement(element);
    
    // Set position for thermal printers
    const x = element.x || 0;
    const y = element.y || 0;
    
    // Process based on element type
    switch (processedElement.type) {
      case 'text':
        this.renderText(processedElement, generator);
        break;
        
      case 'divider':
        this.renderDivider(processedElement, generator);
        break;
        
      case 'table':
        this.renderTable(processedElement, generator);
        break;
        
      case 'image':
        // Images require image processing - handled separately
        this.renderImage(processedElement, generator);
        break;
        
      case 'qrcode':
        this.renderQRCode(processedElement, generator);
        break;
        
      case 'barcode':
        this.renderBarcode(processedElement, generator);
        break;
        
      case 'shape':
        this.renderShape(processedElement, generator);
        break;
        
      case 'signature':
        // Signatures require image - skip for now
        break;
        
      case 'spacer':
        // Spacer adds vertical space
        generator.printAndFeed(Math.ceil((element.height || 10) / 8));
        break;
    }
  }

  /**
   * Bind data to element content
   */
  private bindDataToElement(element: PrintableElement): PrintableElement {
    const processed = { ...element };
    
    if (processed.content) {
      processed.content = this.interpolateData(processed.content);
    }
    
    if (processed.src) {
      processed.src = this.interpolateData(processed.src);
    }
    
    return processed;
  }

  /**
   * Interpolate data into template string
   */
  private interpolateData(template: string): string {
    let result = template;
    
    // Replace all {{path.to.data}} patterns
    const regex = /\{\{([^}]+)\}\}/g;
    result = result.replace(regex, (match, path) => {
      const value = this.getValueByPath(path.trim());
      
      if (value === undefined || value === null) {
        return match; // Keep placeholder if data not found
      }
      
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      
      return String(value);
    });
    
    return result;
  }

  /**
   * Get value by dot-notation path
   */
  private getValueByPath(path: string): any {
    const keys = path.split('.');
    let value: any = this.data;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Render text element
   */
  private renderText(element: PrintableElement, generator: ESCPOSGenerator): void {
    const content = element.content || '';
    
    // Set alignment
    if (element.textAlign) {
      generator.setAlignment(element.textAlign);
    }
    
    // Set font style
    if (element.fontWeight === 'bold') {
      generator.boldOn();
    }
    
    if (element.fontSize && element.fontSize > 14) {
      generator.doubleHeightOn();
    } else if (element.fontSize && element.fontSize > 12) {
      generator.setFont('a');
    }
    
    // Handle multi-line content
    const lines = content.split('\n');
    for (const line of lines) {
      // Apply character wrapping for thermal printers
      const maxChars = this.getMaxCharsPerLine(element);
      const wrappedLines = this.wrapText(line, maxChars);
      
      for (const wrappedLine of wrappedLines) {
        generator.text(wrappedLine);
        generator.newLine();
      }
    }
    
    // Reset formatting
    if (element.fontWeight === 'bold') {
      generator.boldOff();
    }
    
    generator.doubleOff();
    generator.setFont('a');
    generator.alignLeft();
  }

  /**
   * Get max characters per line based on paper size
   */
  private getMaxCharsPerLine(element: PrintableElement): number {
    const paperSize = this.template.pageSize;
    const width = element.width || 0;
    
    // For 58mm paper: ~32 chars
    // For 80mm paper: ~48 chars
    // For A4: ~80 chars
    
    if (width > 0) {
      // Estimate based on element width
      return Math.floor(width * 0.8);
    }
    
    switch (paperSize) {
      case '58mm':
        return 32;
      case '80mm':
        return 48;
      case 'A4':
      case 'A4_LANDSCAPE':
        return 80;
      default:
        return 48;
    }
  }

  /**
   * Wrap text to fit width
   */
  private wrapText(text: string, maxChars: number): string[] {
    if (text.length <= maxChars) {
      return [text];
    }
    
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
   * Render divider element
   */
  private renderDivider(element: PrintableElement, generator: ESCPOSGenerator): void {
    const maxWidth = this.getMaxCharsPerLine(element);
    
    switch (element.lineStyle) {
      case 'dashed':
        generator.printDashedLine(maxWidth);
        break;
      case 'dotted':
        // Dotted line approximation
        let dotted = '';
        for (let i = 0; i < maxWidth; i++) {
          dotted += i % 2 === 0 ? '.' : ' ';
        }
        generator.text(dotted);
        generator.newLine();
        break;
      default:
        generator.printHorizontalLine(maxWidth);
    }
  }

  /**
   * Render table element
   */
  private renderTable(element: PrintableElement, generator: ESCPOSGenerator): void {
    const columns = element.columns || [];
    const source = element.source || 'items';
    const items = this.getTableData(source);
    
    // Calculate column widths
    const totalWidth = element.width || 48;
    const columnWidths = columns.map(col => {
      if (col.width) return col.width;
      return Math.floor(totalWidth / columns.length);
    });
    
    // Print header
    generator.boldOn();
    let headerLine = '';
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const w = columnWidths[i];
      const aligned = this.alignText(col.title, w, col.align || 'left');
      headerLine += aligned + ' ';
    }
    generator.text(headerLine.trim());
    generator.boldOff();
    generator.newLine();
    
    // Print divider
    generator.printDashedLine(totalWidth);
    
    // Print rows
    for (const item of items) {
      let rowLine = '';
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        const key = col.key;
        const w = columnWidths[i];
        const value = this.getValueByPath(`${source}.${key}`) || 
                      (item[key] !== undefined ? String(item[key]) : '');
        
        const aligned = this.alignText(value, w, col.align || 'left');
        rowLine += aligned + ' ';
      }
      generator.text(rowLine.trim());
      generator.newLine();
    }
  }

  /**
   * Get table data from source
   */
  private getTableData(source: string): any[] {
    const value = this.getValueByPath(source);
    if (Array.isArray(value)) {
      return value;
    }
    return [];
  }

  /**
   * Align text within width
   */
  private alignText(text: string, width: number, alignment: 'left' | 'center' | 'right'): string {
    const textLen = text.length;
    
    if (textLen >= width) {
      return text.substring(0, width);
    }
    
    const padding = width - textLen;
    
    switch (alignment) {
      case 'right':
        return ' '.repeat(padding) + text;
      case 'center':
        const leftPad = Math.floor(padding / 2);
        return ' '.repeat(leftPad) + text + ' '.repeat(padding - leftPad);
      default:
        return text + ' '.repeat(padding);
    }
  }

  /**
   * Render image element
   */
  private renderImage(element: PrintableElement, generator: ESCPOSGenerator): void {
    // Image rendering requires image processing
    // For now, skip images in ESC/POS output
    // In production, use canvas to process and convert image to bitmap
  }

  /**
   * Render QR code element
   */
  private renderQRCode(element: PrintableElement, generator: ESCPOSGenerator): void {
    const content = element.content || '';
    if (!content) return;
    
    // Get QR code size based on element width
    const size = Math.min(Math.floor((element.width || 20) / 8), 4);
    const correction: QRErrorCorrection = 'M';
    
    try {
      generator.printQRCode(content, size, correction);
    } catch (error) {
      // Fallback: print as text
      generator.text(`[QR: ${content}]`);
      generator.newLine();
    }
  }

  /**
   * Render barcode element
   */
  private renderBarcode(element: PrintableElement, generator: ESCPOSGenerator): void {
    const content = element.content || '';
    if (!content) return;
    
    // Set barcode height
    const height = Math.floor(element.height || 15);
    generator.setBarcodeHeight(height);
    generator.setBarcodeWidth(2);
    generator.setBarcodeTextPosition('below');
    
    try {
      generator.printBarcode(content, 'CODE128');
    } catch (error) {
      // Fallback: print as text
      generator.text(`[BARCODE: ${content}]`);
      generator.newLine();
    }
  }

  /**
   * Render shape element
   */
  private renderShape(element: PrintableElement, generator: ESCPOSGenerator): void {
    // Shapes are mainly for PDF - minimal support in ESC/POS
    if (element.shapeType === 'line') {
      generator.printHorizontalLine(this.getMaxCharsPerLine(element));
    }
  }

  /**
   * Render to PDF
   */
  renderToPDF(): string {
    return generatePDF(this.template, this.data);
  }

  /**
   * Get rendered preview as base64
   */
  getPreviewBase64(format: OutputFormat = 'pdf'): string {
    const output = this.render(format);
    
    if (output instanceof Uint8Array) {
      let binary = '';
      for (let i = 0; i < output.length; i++) {
        binary += String.fromCharCode(output[i]);
      }
      return btoa(binary);
    }
    
    return btoa(output);
  }
}

// ============================================================
// DOCUMENT TYPE HANDLERS
// ============================================================

export class DocumentHandler {
  /**
   * Prepare print data from various document types
   */
  static prepareData(
    documentType: string,
    document: any,
    business: any,
    options?: any
  ): PrintDataContext {
    const baseData: PrintDataContext = {
      business: {
        name: business.name || 'Business Name',
        address: business.address || '',
        phone: business.phone || '',
        email: business.email || '',
        website: business.website || '',
        logo: business.logo || '',
        kraPin: business.kraPin || '',
        vatNumber: business.vatNumber || '',
        bankName: business.bankName || '',
        bankAccount: business.bankAccount || '',
        bankBranch: business.bankBranch || ''
      },
      items: []
    };

    switch (documentType) {
      case 'receipt':
      case 'invoice':
        return this.prepareInvoiceData(document, baseData, options);
      case 'creditInvoice':
        return this.prepareCreditInvoiceData(document, baseData, options);
      case 'delivery':
        return this.prepareDeliveryData(document, baseData, options);
      case 'purchase':
        return this.preparePurchaseData(document, baseData, options);
      case 'quotation':
        return this.prepareQuotationData(document, baseData, options);
      case 'order':
        return this.prepareOrderData(document, baseData, options);
      case 'payment':
        return this.preparePaymentData(document, baseData, options);
      case 'statement':
        return this.prepareStatementData(document, baseData, options);
      case 'transaction':
        return this.prepareTransactionData(document, baseData, options);
      default:
        return baseData;
    }
  }

  /**
   * Prepare invoice/receipt data
   */
  private static prepareInvoiceData(doc: any, base: PrintDataContext, options?: any): PrintDataContext {
    const data = { ...base };
    

    
    data.invoice = {
      number: doc.invoiceNumber || doc.number || '',
      date: this.formatDate(doc.invoiceDate || doc.date || doc.createdAt),
      dueDate: doc.dueDate ? this.formatDate(doc.dueDate) : '',
      subtotal: this.formatCurrency(doc.subtotal || 0),
      tax: this.formatCurrency(doc.tax || 0),
      taxRate: String(doc.taxRate || 0),
      total: this.formatCurrency(doc.total || 0),
      paymentTerms: String(doc.paymentTerms || 30),
      discount: doc.discount ? this.formatCurrency(doc.discount) : '',
      status: doc.status || 'Pending'
    };
    
    data.customer = {
      name: doc.customerName || doc.customer?.name || 'Cash Customer',
      address: doc.customerAddress || doc.customer?.address || '',
      phone: doc.customerPhone || doc.customer?.phone || '',
      email: doc.customer?.email || ''
    };
    
    data.items = (doc.items || []).map((item: any) => ({
      name: item.productName || item.name || 'Item',
      quantity: item.quantity || 1,
      price: this.formatCurrency(item.unitPrice || item.price || 0),
      total: this.formatCurrency(item.total || item.quantity * (item.unitPrice || item.price) || 0),
      sku: item.sku || '',
      unit: item.unit || '',
      discount: item.discount ? this.formatCurrency(item.discount) : ''
    }));
    

    
    // Handle payment data - can be nested or at root level for invoices
    if (doc.payment) {
      data.payment = {
        amount: this.formatCurrency(doc.payment.amount || doc.total),
        method: doc.payment.method || 'Cash',
        reference: doc.payment.reference || '',
        change: doc.payment.change ? this.formatCurrency(doc.payment.change) : ''
      };
    } else if (doc.amountPaid !== undefined) {
      // Invoice-level payment info
      const paid = doc.amountPaid || 0;
      const total = doc.total || 0;
      const balance = total - paid;
      const lastPayment = doc.payments && doc.payments.length > 0 ? doc.payments[doc.payments.length - 1] : null;
      data.payment = {
        amount: this.formatCurrency(paid),
        method: lastPayment?.method || 'N/A',
        reference: lastPayment?.reference || '',
        change: this.formatCurrency(balance > 0 ? balance : 0)
      };
    }
    
    if (doc.cashier) {
      data.cashier = {
        name: doc.cashier.name || doc.cashierName || '',
        id: doc.cashier.id || ''
      };
    }
    
    return data;
  }

  /**
   * Prepare credit invoice data
   */
  private static prepareCreditInvoiceData(doc: any, base: PrintDataContext, options?: any): PrintDataContext {
    const data = { ...base };
    
    data.creditInvoice = {
      number: doc.invoiceNumber || doc.number || '',
      date: this.formatDate(doc.date || doc.invoiceDate || doc.createdAt),
      dueDate: doc.dueDate ? this.formatDate(doc.dueDate) : '',
      referenceNumber: doc.referenceInvoiceNumber || '',
      reason: doc.description || doc.notes || '',
      subtotal: this.formatCurrency(doc.subtotal || 0),
      tax: this.formatCurrency(doc.tax || 0),
      taxRate: String(doc.taxRate || 0),
      total: this.formatCurrency(doc.total || 0),
      paymentTerms: String(doc.paymentTerms || 30),
      notes: doc.notes || ''
    };
    
    data.customer = {
      name: doc.customer?.name || doc.customerName || 'Cash Customer',
      address: doc.customer?.address || doc.customerAddress || '',
      phone: doc.customer?.phone || doc.customerPhone || '',
      email: doc.customer?.email || ''
    };
    
    data.items = (doc.items || []).map((item: any) => ({
      name: item.name || item.productName || 'Item',
      quantity: item.quantity || 1,
      price: this.formatCurrency(item.price || 0),
      total: this.formatCurrency(item.total || item.quantity * item.price || 0),
      sku: item.sku || '',
      unit: item.unit || '',
      discount: item.discount ? this.formatCurrency(item.discount) : ''
    }));
    
    if (doc.cashier) {
      data.cashier = {
        name: doc.cashier.name || doc.cashierName || '',
        id: doc.cashier.id || ''
      };
    }
    
    return data;
  }

  /**
   * Prepare delivery note data
   */
  private static prepareDeliveryData(doc: any, base: PrintDataContext, options?: any): PrintDataContext {
    const data = { ...base };
    
    data.delivery = {
      number: doc.deliveryNoteNumber || doc.number || '',
      date: this.formatDate(doc.date || doc.deliveryDate || doc.createdAt),
      recipientName: doc.recipientName || doc.customer?.name || '',
      recipientAddress: doc.recipientAddress || doc.customer?.address || '',
      recipientPhone: doc.recipientPhone || doc.customer?.phone || '',
      orderNumber: doc.orderReference || doc.orderNumber || '',
      notes: doc.notes || ''
    };
    
    data.items = (doc.items || doc.products || []).map((item: any) => ({
      name: item.name || item.productName || 'Item',
      quantity: item.quantity || 1,
      price: '',
      total: '',
      units: item.units || 'pcs'
    }));
    
    return data;
  }

  /**
   * Prepare purchase order data
   */
  private static preparePurchaseData(doc: any, base: PrintDataContext, options?: any): PrintDataContext {
    const data = { ...base };
    
    data.purchase = {
      number: doc.purchaseOrderNumber || doc.number || '',
      date: this.formatDate(doc.date || doc.createdAt),
      expectedDelivery: doc.expectedDelivery ? this.formatDate(doc.expectedDelivery) : '',
      subtotal: this.formatCurrency(doc.subtotal || 0),
      tax: this.formatCurrency(doc.tax || 0),
      total: this.formatCurrency(doc.total || 0),
      notes: doc.notes || ''
    };
    
    data.supplier = {
      name: doc.supplier?.name || doc.supplierName || '',
      address: doc.supplier?.address || '',
      phone: doc.supplier?.phone || '',
      email: doc.supplier?.email || ''
    };
    
    data.items = (doc.items || []).map((item: any) => ({
      name: item.name || item.productName || 'Item',
      quantity: item.quantity || 1,
      price: this.formatCurrency(item.unitCost || item.price || 0),
      total: this.formatCurrency(item.total || item.quantity * (item.unitCost || item.price) || 0)
    }));
    
    return data;
  }

  /**
   * Prepare quotation data
   */
  private static prepareQuotationData(doc: any, base: PrintDataContext, options?: any): PrintDataContext {
    const data = { ...base };
    
    data.quotation = {
      number: doc.quotationNumber || doc.number || '',
      date: this.formatDate(doc.date || doc.createdAt),
      validUntil: doc.validUntil ? this.formatDate(doc.validUntil) : '',
      subtotal: this.formatCurrency(doc.subtotal || 0),
      tax: this.formatCurrency(doc.tax || 0),
      total: this.formatCurrency(doc.total || 0),
      terms: doc.terms || ''
    };
    
    data.customer = {
      name: doc.customer?.name || doc.customerName || 'Customer',
      address: doc.customer?.address || '',
      phone: doc.customer?.phone || '',
      email: doc.customer?.email || ''
    };
    
    data.items = (doc.items || []).map((item: any) => ({
      name: item.name || item.productName || 'Item',
      quantity: item.quantity || 1,
      price: this.formatCurrency(item.price || 0),
      total: this.formatCurrency(item.total || item.quantity * item.price || 0)
    }));
    
    return data;
  }

  /**
   * Prepare order data
   */
  private static prepareOrderData(doc: any, base: PrintDataContext, options?: any): PrintDataContext {
    const data = { ...base };
    
    data.order = {
      number: doc.orderNumber || doc.number || '',
      date: this.formatDate(doc.date || doc.createdAt),
      status: doc.status || 'Pending',
      notes: doc.notes || ''
    };
    
    data.customer = {
      name: doc.customer?.name || doc.customerName || 'Customer',
      address: doc.customer?.address || '',
      phone: doc.customer?.phone || ''
    };
    
    data.items = (doc.items || []).map((item: any) => ({
      name: item.name || item.productName || 'Item',
      quantity: item.quantity || 1,
      price: this.formatCurrency(item.price || 0),
      total: this.formatCurrency(item.total || 0)
    }));
    
    return data;
  }

  /**
   * Prepare payment receipt data
   */
  private static preparePaymentData(doc: any, base: PrintDataContext, options?: any): PrintDataContext {
    const data = { ...base };
    
    data.payment = {
      amount: this.formatCurrency(doc.amount || 0),
      method: doc.method || doc.paymentMethod || 'Cash',
      reference: doc.reference || doc.receiptNumber || '',
      change: ''
    };
    
    data.transaction = {
      id: doc.transactionId || doc.id || '',
      type: doc.type || 'payment',
      amount: this.formatCurrency(doc.amount || 0),
      reference: doc.reference || '',
      timestamp: this.formatDate(doc.date || doc.createdAt),
      status: doc.status || 'Completed'
    };
    
    data.customer = {
      name: doc.customer?.name || doc.customerName || '',
      address: doc.customer?.address || doc.customerAddress || '',
      phone: doc.customer?.phone || doc.customerPhone || '',
      email: doc.customer?.email || ''
    };
    
    if (doc.invoice) {
      data.invoice = {
        number: doc.invoice.number || doc.invoiceNumber || '',
        date: this.formatDate(doc.invoice.date || doc.invoiceDate),
        subtotal: this.formatCurrency(doc.invoice.subtotal || doc.subtotal || 0),
        discount: this.formatCurrency(doc.invoice.discountAmount || doc.discountAmount || 0),
        tax: this.formatCurrency(doc.invoice.tax || doc.tax || 0),
        taxRate: doc.invoice.taxRate || doc.taxRate || 16,
        total: this.formatCurrency(doc.invoice.total || doc.total || 0),
        status: doc.invoice.status || doc.status || 'pending',
        dueDate: this.formatDate(doc.invoice.dueDate || doc.dueDate),
        paymentTerms: String(doc.invoice.paymentTerms || doc.paymentTerms || 30)
      };
    }
    
    return data;
  }

  /**
   * Prepare statement data
   */
  private static prepareStatementData(doc: any, base: PrintDataContext, options?: any): PrintDataContext {
    const data = { ...base };
    
    data.statement = {
      period: doc.period || 'Statement Period',
      startDate: this.formatDate(doc.startDate),
      endDate: this.formatDate(doc.endDate),
      openingBalance: this.formatCurrency(doc.openingBalance || 0),
      closingBalance: this.formatCurrency(doc.closingBalance || 0),
      transactions: (doc.transactions || []).map((t: any) => ({
        date: this.formatDate(t.date),
        description: t.description || '',
        debit: t.debit ? this.formatCurrency(t.debit) : '',
        credit: t.credit ? this.formatCurrency(t.credit) : '',
        balance: this.formatCurrency(t.balance || 0)
      }))
    };
    
    data.customer = {
      name: doc.customer?.name || doc.customerName || ''
    };
    
    return data;
  }

  /**
   * Prepare transaction data
   */
  private static prepareTransactionData(doc: any, base: PrintDataContext, options?: any): PrintDataContext {
    const data = { ...base };
    
    data.transaction = {
      id: doc.transactionId || doc.id || '',
      type: doc.type || 'sale',
      amount: this.formatCurrency(doc.amount || doc.total || 0),
      reference: doc.reference || doc.transactionId || '',
      timestamp: this.formatDate(doc.date || doc.createdAt),
      status: doc.status || 'Completed'
    };
    
    data.items = (doc.items || []).map((item: any) => ({
      name: item.name || item.productName || 'Item',
      quantity: item.quantity || 1,
      price: this.formatCurrency(item.price || 0),
      total: this.formatCurrency(item.total || 0)
    }));
    
    return data;
  }

  /**
   * Format date
   */
  private static formatDate(date: string | Date): string {
    if (!date) return '';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);
    
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Format currency
   */
  private static formatCurrency(amount: number | string): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
    if (isNaN(num)) return '0.00';
    
    return num.toFixed(2);
  }
}

// ============================================================
// FACTORY FUNCTION
// ============================================================

export function createTemplateEngine(options: {
  template: PrintableTemplate;
  data: PrintDataContext;
  encoding?: CharacterEncoding;
}): TemplateEngine {
  return new TemplateEngine(options);
}

export default TemplateEngine;
