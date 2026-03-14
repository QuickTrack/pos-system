# Active Context: POS System with Receipt Printing Engine

## Current State

**Template Status**: ✅ Receipt Printing Engine with Template Selection

The POS system now has a comprehensive receipt printing engine with support for multiple document types, printer models, paper sizes, character encodings, and output formats including ESC/POS commands, PDF generation, and direct USB/Bluetooth/Network printing while handling various design templates, dynamic data binding, barcode generation, QR codes, logo printing, and multi-language text with proper alignment, formatting, and error handling.

## Recently Completed

- [x] Base Next.js 16 setup with App Router
- [x] TypeScript configuration with strict mode
- [x] Tailwind CSS 4 integration
- [x] ESLint configuration
- [x] Memory bank documentation
- [x] Recipe system for common features
- [x] Receipt Printing Engine Implementation
  - ESC/POS command generator
  - Barcode/QR code generators
  - PDF generation module
  - Printer connection handlers (USB/Bluetooth/Network)
  - Template rendering engine
  - Document type handlers
- [x] Print API endpoints
- [x] PrintPreview UI component with template selection
- [x] Backoffice invoices print integration
- [x] Sales page print integration with template selection

## Current Structure

| File/Directory | Purpose | Status |
|----------------|---------|--------|
| `src/lib/print-engine/` | Print engine core | ✅ Complete |
| `src/lib/print-engine/types.ts` | TypeScript types | ✅ |
| `src/lib/print-engine/escpos-generator.ts` | ESC/POS commands | ✅ |
| `src/lib/print-engine/barcode-generator.ts` | Barcode/QR generation | ✅ |
| `src/lib/print-engine/pdf-generator.ts` | PDF generation | ✅ |
| `src/lib/print-engine/printer-connection.ts` | USB/BT/Network | ✅ |
| `src/lib/print-engine/template-engine.ts` | Template rendering | ✅ |
| `src/models/Printer.ts` | Printer model | ✅ |
| `src/app/api/print/route.ts` | Print API | ✅ |
| `src/app/api/printers/route.ts` | Printer management | ✅ |
| `src/components/print/PrintPreview.tsx` | Print UI | ✅ |

## Print Engine Features

### Document Types Supported
- Receipts
- Invoices
- Orders
- Quotations
- Delivery Notes
- Purchase Orders
- Payment Receipts
- Financial Statements
- Transactions

### Printer Support
- USB (WebUSB)
- Bluetooth (Web Bluetooth)
- Network (TCP/IP)
- Serial (Web Serial)

### Paper Sizes
- 58mm thermal
- 80mm thermal
- A4
- A4 Landscape
- Half Page

### Output Formats
- ESC/POS commands (thermal printers)
- PDF generation
- Raw data

### Barcode/QR Support
- CODE39
- CODE128
- UPC-A
- EAN-13
- QR Codes with error correction

### Character Encodings
- PC437, PC850, PC860, PC863, PC865, PC858
- UTF-8
- GB18030, Shift-JIS, EUC-KR

## Quick Start Guide

### To use the print engine:

```typescript
import { PrintEngine, DocumentHandler } from '@/lib/print-engine';

// Prepare data
const data = DocumentHandler.prepareData('invoice', invoiceDoc, business);

// Print
const result = await printEngine.print({
  documentType: 'invoice',
  document: invoiceDoc,
  business,
  template,
  format: 'escpos'
});
```

### API Endpoints

- `POST /api/print` - Print document
- `GET /api/print` - Get capabilities
- `GET /api/printers` - List printers
- `POST /api/printers` - Add printer

## Available Recipes

| Recipe | File | Use Case |
|--------|------|----------|
| Add Database | `.kilocode/recipes/add-database.md` | Data persistence with Drizzle + SQLite |

## Session History

| Date | Changes |
|------|---------|
| Initial | Template created with base setup |
| 2026-03-14 | Implemented comprehensive receipt printing engine |
| 2026-03-14 | Added template selection to PrintPreview, integrated in backoffice-invoices and sales pages |

## Notes

The print engine integrates with the existing DocumentTemplate system. Templates can be designed using the document-templates page and then used for printing via the print engine.
