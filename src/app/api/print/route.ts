import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import { getAuthUser } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';
import Printer from '@/models/Printer';
import DocumentTemplate from '@/models/DocumentTemplate';
import Settings from '@/models/Settings';
import { PrintEngine, DocumentHandler, PrintableTemplate } from '@/lib/print-engine';
import { DocumentType, OutputFormat, CharacterEncoding } from '@/lib/print-engine/types';

// POST /api/print - Print a document
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      documentType,
      documentId,
      document,
      templateId,
      printerId,
      format = 'escpos',
      encoding = 'PC437',
      copies = 1,
      preview = false
    } = body;

    // Validate required fields
    if (!documentType || (!document && !documentId)) {
      return NextResponse.json(
        { error: 'Missing required fields: documentType and document (or documentId)' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Get business settings
    const settings = await Settings.findOne({ 
      branch: user.branch 
    }).lean();
    
    const business = {
      name: settings?.businessName || 'Business Name',
      address: settings?.address || '',
      phone: settings?.phone || '',
      email: settings?.email || '',
      website: settings?.website || '',
      logo: settings?.logo || '',
      kraPin: settings?.kraPin || 'N/A',
      vatNumber: settings?.vatNumber || '',
      bankName: settings?.bankName || 'N/A',
      bankAccount: settings?.bankAccount || 'N/A',
      bankBranch: settings?.bankBranch || 'N/A'
    };

    // Get template
    let template: PrintableTemplate | undefined;
    if (templateId) {
      const templateDoc = await DocumentTemplate.findById(templateId).lean();
      if (templateDoc) {
        template = templateDoc as unknown as PrintableTemplate;
      }
    } else {
      // Try to get default template for document type
      const defaultTemplate = await DocumentTemplate.findOne({
        category: documentType,
        $or: [
          { branch: user.branch },
          { isBuiltIn: true }
        ],
        isDefault: true
      }).lean();
      
      if (defaultTemplate) {
        template = defaultTemplate as unknown as PrintableTemplate;
      }
    }

    // If no template, create a basic one based on paper size
    if (!template) {
      const paperSize = body.paperSize || '80mm';
      template = createDefaultTemplate(documentType, paperSize);
    }

    // Prepare print data - normalize document fields for DocumentHandler
    const printData = { ...document };
    

    
    // Ensure customer data is at the top level for DocumentHandler
    if (printData.customer && typeof printData.customer === 'object') {
      printData.customerName = printData.customer.name || printData.customerName || '';
      printData.customerPhone = printData.customer.phone || printData.customerPhone || '';
      printData.customerAddress = printData.customer.address || printData.customerAddress || '';
    }
    
    // Ensure invoice number is available
    if (!printData.invoiceNumber && !printData.number) {
      printData.invoiceNumber = printData.number || '';
    }
    
    // Ensure status is available (map from various sources)
    if (!printData.status) {
      printData.status = printData.status || 'Pending';
    }
    
    // Ensure paymentTerms is available
    if (!printData.paymentTerms && printData.paymentTerms !== 0) {
      printData.paymentTerms = 30;
    }
    
    // Ensure discount is available
    if (!printData.discount) {
      printData.discount = 0;
    }
    
    // Ensure tax fields are available
    if (!printData.tax) {
      printData.tax = printData.taxRate ? printData.total * (printData.taxRate / 100) : 0;
    }
    
    // Ensure subtotal is available
    if (!printData.subtotal) {
      printData.subtotal = printData.total - (printData.tax || 0) - (printData.discount || 0);
    }

    // Get printer config if printerId provided
    let printerConfig = undefined;
    if (printerId) {
      const printer = await Printer.findById(printerId);
      if (printer) {
        printerConfig = {
          id: printer._id.toString(),
          name: printer.name,
          model: printer.printerModel as any,
          connection: printer.connection as any,
          paperSize: printer.paperSize,
          encoding: printer.encoding,
          maxPrintWidth: printer.maxPrintWidth,
          supportQR: printer.supportQR,
          supportCJK: printer.supportCJK,
          quality: printer.quality as any,
          isDefault: printer.isDefault,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
    }

    // Create print engine
    const engine = new PrintEngine({ defaultEncoding: encoding as CharacterEncoding });

    if (preview) {
      // Generate preview
      const previewResult = engine.preview({
        documentType: documentType as DocumentType,
        document: printData,
        business,
        template,
        format: format as OutputFormat,
        encoding: encoding as CharacterEncoding
      });
      
      // Debug: Verify PDF header
      const decodedSample = Buffer.from(previewResult.data.substring(0, 50), 'base64').toString('binary');
      console.log('[PRINT] PDF generated:', {
        dataLength: previewResult.data.length,
        header: decodedSample.substring(0, 30)
      });

      return NextResponse.json({
        success: true,
        preview: {
          data: previewResult.data,
          mimeType: previewResult.mimeType,
          size: previewResult.data.length
        }
      });
    }

    // Print document
    const result = await engine.print({
      documentType: documentType as DocumentType,
      document: printData,
      business,
      template,
      printer: printerConfig,
      format: format as OutputFormat,
      encoding: encoding as CharacterEncoding,
      copies
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 });
    }

    // Convert output to base64
    let outputBase64 = '';
    if (result.output) {
      if (result.output instanceof Uint8Array) {
        let binary = '';
        for (let i = 0; i < result.output.length; i++) {
          binary += String.fromCharCode(result.output[i]);
        }
        outputBase64 = btoa(binary);
      } else {
        outputBase64 = btoa(result.output);
      }
    }

    return NextResponse.json({
      success: true,
      output: outputBase64,
      format,
      size: result.output ? (result.output instanceof Uint8Array ? result.output.length : result.output.length) : 0
    });

  } catch (error) {
    console.error('Print error:', error);
    return NextResponse.json(
      { error: 'Failed to print document' },
      { status: 500 }
    );
  }
}

// Helper to create default template
function createDefaultTemplate(documentType: string, paperSize: string): PrintableTemplate {
  const is58mm = paperSize === '58mm';
  const width = is58mm ? 58 : 80;
  
  return {
    name: 'Default Template',
    category: documentType as any,
    pageSize: paperSize as any,
    orientation: 'portrait',
    margins: { top: 5, right: 5, bottom: 5, left: 5 },
    elements: [
      {
        id: 'business_name',
        type: 'text',
        content: '{{business.name}}',
        x: 0,
        y: 0,
        width,
        height: 15,
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center'
      },
      {
        id: 'business_info',
        type: 'text',
        content: '{{business.address}}\n{{business.phone}}',
        x: 0,
        y: 20,
        width,
        height: 20,
        fontSize: 10,
        textAlign: 'center'
      },
      {
        id: 'divider1',
        type: 'divider',
        x: 0,
        y: 45,
        width,
        height: 3,
        lineStyle: 'dashed'
      },
      {
        id: 'items_table',
        type: 'table',
        source: 'items',
        x: 0,
        y: 55,
        width,
        height: 200,
        columns: [
          { key: 'name', title: 'Item', width: width * 0.4 },
          { key: 'quantity', title: 'Qty', width: width * 0.15, align: 'center' },
          { key: 'price', title: 'Price', width: width * 0.2, align: 'right' },
          { key: 'total', title: 'Total', width: width * 0.25, align: 'right' }
        ]
      }
    ]
  };
}

// GET /api/print - Get print capabilities/status
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const printerId = searchParams.get('printerId');

    await dbConnect();

    if (action === 'status' && printerId) {
      // Get printer status
      const printer = await Printer.findById(printerId);
      if (!printer) {
        return NextResponse.json({ error: 'Printer not found' }, { status: 404 });
      }

      // Try to connect and get status (this would work server-side)
      const engine = new PrintEngine();
      const result = await engine.testPrinter({
        id: printer._id.toString(),
        name: printer.name,
        model: printer.printerModel as any,
        connection: printer.connection as any,
        paperSize: printer.paperSize,
        encoding: printer.encoding,
        maxPrintWidth: printer.maxPrintWidth,
        supportQR: printer.supportQR,
        supportCJK: printer.supportCJK,
        quality: printer.quality as any,
        isDefault: printer.isDefault,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return NextResponse.json({
        printer: {
          id: printer._id,
          name: printer.name,
          status: result.success ? 'online' : 'offline',
          error: result.error
        }
      });
    }

    // Get available templates
    const templates = await DocumentTemplate.find({
      $or: [
        { branch: user.branch },
        { isBuiltIn: true }
      ]
    }).select('name category pageSize isDefault');

    // Get available printers
    const printers = await Printer.find({
      $or: [
        { branch: user.branch },
        { branch: null }
      ],
      isActive: true
    }).select('name printerModel paperSize isDefault');

    return NextResponse.json({
      success: true,
      capabilities: {
        formats: ['escpos', 'pdf', 'raw'],
        encodings: ['PC437', 'PC850', 'PC860', 'PC863', 'PC865', 'PC858', 'UTF8'],
        paperSizes: ['58mm', '80mm', 'A4', 'A4_LANDSCAPE', 'HALF_PAGE'],
        documentTypes: ['receipt', 'invoice', 'order', 'quotation', 'delivery', 'purchase', 'payment', 'statement', 'transaction']
      },
      templates,
      printers
    });

  } catch (error) {
    console.error('Print GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get print info' },
      { status: 500 }
    );
  }
}
