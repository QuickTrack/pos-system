// ============================================================
// PRINT ENGINE MODULE
// Main entry point for the receipt printing engine
// ============================================================

// Types
export * from './types';

// Core Components
export { ESCPOSGenerator, createESCPOSGenerator } from './escpos-generator';
export { BarcodeGenerator, QRCodeGenerator, generateBarcode, generateQRCode } from './barcode-generator';
export { PDFGenerator, generatePDF } from './pdf-generator';
export { TemplateEngine, DocumentHandler, createTemplateEngine } from './template-engine';

// Connection Handlers
export { 
  NetworkPrinterConnection, 
  USBPrinterConnection, 
  BluetoothPrinterConnection,
  SerialPrinterConnection,
  PrintServerConnection,
  createPrinterConnection,
  printServer 
} from './printer-connection';

// ============================================================
// MAIN PRINT ENGINE CLASS
// ============================================================

import { 
  PrintDataContext, 
  OutputFormat, 
  PrinterConfig, 
  DocumentType,
  PrintableTemplate,
  CharacterEncoding 
} from './types';
import { TemplateEngine, DocumentHandler } from './template-engine';
import { createPrinterConnection, PrinterConnection } from './printer-connection';

export class PrintEngine {
  private defaultEncoding: CharacterEncoding;
  private defaultFormat: OutputFormat;

  constructor(options?: {
    defaultEncoding?: CharacterEncoding;
    defaultFormat?: OutputFormat;
  }) {
    this.defaultEncoding = options?.defaultEncoding || 'PC437';
    this.defaultFormat = options?.defaultFormat || 'escpos';
  }

  /**
   * Print a document
   */
  async print(options: {
    documentType: DocumentType;
    document: any;
    business: any;
    template?: PrintableTemplate;
    printer?: PrinterConfig;
    format?: OutputFormat;
    encoding?: CharacterEncoding;
    copies?: number;
  }): Promise<{ success: boolean; output?: Uint8Array | string; error?: string }> {
    try {
      const { 
        documentType, 
        document, 
        business, 
        template, 
        printer,
        format = this.defaultFormat,
        encoding = this.defaultEncoding,
        copies = 1 
      } = options;

      // Prepare data context
      const data = DocumentHandler.prepareData(documentType, document, business);

      // Create template engine
      const engine = new TemplateEngine({
        template: template as PrintableTemplate,
        data,
        encoding
      });

      // Render document
      const output = engine.render(format);

      // If printer specified, send to printer
      if (printer) {
        await this.sendToPrinter(printer, output, copies);
      }

      return {
        success: true,
        output
      };
    } catch (error) {
      console.error('Print error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate print preview
   */
  preview(options: {
    documentType: DocumentType;
    document: any;
    business: any;
    template?: PrintableTemplate;
    format?: OutputFormat;
    encoding?: CharacterEncoding;
  }): { data: string; mimeType: string } {
    const { 
      documentType, 
      document, 
      business, 
      template,
      format = 'pdf',
      encoding = this.defaultEncoding 
    } = options;

    // Prepare data context
    const data = DocumentHandler.prepareData(documentType, document, business);

    // Create template engine
    const engine = new TemplateEngine({
      template: template as PrintableTemplate,
      data,
      encoding
    });

    // Render document
    const output = engine.render(format);

    // Convert to base64
    let base64: string;
    let mimeType: string;

    // Use Buffer for proper base64 encoding in Node.js
    if (output instanceof Uint8Array) {
      base64 = Buffer.from(output).toString('base64');
      mimeType = format === 'pdf' ? 'application/pdf' : 'application/octet-stream';
    } else {
      // Handle string output - convert to buffer without specifying encoding to preserve bytes
      base64 = Buffer.from(output).toString('base64');
      // Check if it's PDF format (starts with %PDF) or requested as PDF
      if (format === 'pdf' || (typeof output === 'string' && output.startsWith('%PDF'))) {
        mimeType = 'application/pdf';
      } else {
        mimeType = 'text/plain';
      }
    }

    return {
      data: base64,
      mimeType
    };
  }

  /**
   * Send data to printer
   */
  private async sendToPrinter(
    printer: PrinterConfig, 
    output: Uint8Array | string, 
    copies: number
  ): Promise<void> {
    // Create connection
    const connection = createPrinterConnection(
      printer.connection.type,
      printer.connection
    );

    try {
      // Connect
      await connection.connect();

      // Send data for each copy
      const data = output instanceof Uint8Array 
        ? output 
        : new TextEncoder().encode(output);

      for (let i = 0; i < copies; i++) {
        await connection.send(data);
        
        // Small delay between copies
        if (i < copies - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } finally {
      // Disconnect
      await connection.disconnect();
    }
  }

  /**
   * Get printer status
   */
  async getPrinterStatus(printer: PrinterConfig): Promise<any> {
    const connection = createPrinterConnection(
      printer.connection.type,
      printer.connection
    );

    try {
      await connection.connect();
      const status = await connection.getStatus();
      return status;
    } finally {
      await connection.disconnect();
    }
  }

  /**
   * Test printer connection
   */
  async testPrinter(printer: PrinterConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const connection = createPrinterConnection(
        printer.connection.type,
        printer.connection
      );

      await connection.connect();
      const status = await connection.getStatus();
      await connection.disconnect();

      return {
        success: status.online,
        error: status.error
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }
}

// ============================================================
// DEFAULT INSTANCE
// ============================================================

export const printEngine = new PrintEngine();

export default PrintEngine;
