# Active Context: POS System with Full-Screen Create Invoice

## Current State

**Template Status**: ✅ Template Designer Removed

Removed the template designer module completely:
- Removed document-templates page (template designer UI)
- Disabled template creation API (POST returns 403)
- Removed individual template edit/delete API routes
- Removed Templates menu item from sidebar navigation
- Print functionality preserved (uses built-in templates)

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
- [x] Customer Debt API endpoint (`/api/customers/[id]/debt`)
- [x] POS customer debt modal with outstanding balance display
- [x] Customer payment selection improvements
- [x] Dashboard recent sales filtering by period
- [x] Sale model paymentMethod enum fix (added 'account')
- [x] POS auto-print receipt after sale completion (all payment methods)
- [x] Customer credit invoice API endpoint (`/api/customer-invoices/credit`)
- [x] Customer model updated with creditBalance tracking
- [x] POS account payment creates credit invoice and updates customer debt
- [x] Backoffice invoices "Credit Invoice" button for manual credit creation
- [x] CustomerInvoice model invoiceType field ('sale' | 'credit')
- [x] Invoice creation UI redesigned to match POS sale window pattern
  - Top-bottom layout with products grid on top
  - Category filtering
  - Horizontal scrollable products grid (clickable cards)
  - Customer search modal selection
  - Cart with inline quantity adjustment (+/- buttons)
  - Unit selector dropdown for products with multiple units
  - Running totals display (Subtotal, VAT, Total)
- [x] Customer Statements Feature
  - Customer statements API endpoint (`/api/customers/[id]/statement`)
  - CustomerStatementModal component with full UI
  - Date range filtering for transactions
  - Aged receivables summary (current, 30, 60, 90, over 90 days)
  - Professional printable view with company header
  - Print button with proper print CSS styles
  - CSV export functionality
  - "Statements" button added to Customer Payments page
- [x] Create Invoice Page Full Screen Layout
  - Modal changed from `size="xl"` to `size="full"` for full viewport
  - Content layout updated to use `h-[calc(100vh-65px)]` like POS page
  - Customer selection bar streamlined with inline label
  - Products grid changed to horizontal scrollable (`overflow-x-auto`)
  - Product cards now flex-shrink-0 with fixed width for horizontal scrolling
  - Cart/Items section height adjusted (minHeight: 220px, maxHeight: 280px)
  - Invoice details footer padding reduced and font sizes adjusted
- [x] Template Designer Removed
  - Removed document-templates page
  - Disabled POST /api/document-templates (returns 403)
  - Removed DELETE /api/document-templates/[id] route
  - Removed PUT /api/document-templates/[id] route
  - Removed Templates menu from sidebar
  - Print functionality preserved (built-in templates only)
- [x] PrintPreview Component - ESC/POS Direct Print
  - Removed template selection dropdown from preview window
  - Removed template fetching and state management
  - Removed PDF preview generation
  - Removed format='pdf' options
  - HTML-based A4 preview styled like customer statements
  - Direct print to thermal printers (USB, Bluetooth, Network)
  - ESC/POS command generation for thermal printing
  - Copy selection option
  - Professional A4 layout with proper typography and visual hierarchy
- [x] Create Invoice Page Print Functionality
  - Added PrintPreview component integration
  - Print button opens print preview modal with invoice data
  - Passes full invoice details including items, tax, discounts, and balance due
- [x] Invoice Print Template Enhancement
  - Added Subtotal, Tax, Total breakdown in invoice print preview
  - Added Terms & Payment Terms field to Settings (Tax tab)
  - Invoice terms appear on printed invoices below the total
- [x] Customer Details Modal Full Screen
  - Changed modal from `size="xl"` to `size="full"` for full viewport display
  - Modal now maximizes available screen space when viewing customer details
  - Uses Modal component's built-in full-screen rendering with scrollable content
- [x] Customer Payment Balance Update
  - Payment creation API now decreases customer creditBalance
  - Payment recording API now decreases customer creditBalance
  - Customer-payments page refreshes customers after payment operations

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
| `src/app/api/customers/[id]/debt/route.ts` | Customer debt API | ✅ |
| `src/app/pos/page.tsx` | POS with debt modal | ✅ |
| `src/app/api/customers/[id]/statement/route.ts` | Customer statements API | ✅ |
| `src/components/customer-statement/CustomerStatementModal.tsx` | Statement modal component | ✅ |
| `src/app/customer-payments/page.tsx` | Customer payments with statement button | ✅ |
| `src/models/Settings.ts` | Settings with bank fields | ✅ Updated |

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
| 2026-03-17 | Added customer debt API endpoint and POS debt modal |
| 2026-03-17 | Fixed dashboard recent sales to filter by period |
| 2026-03-17 | Fixed customer payment selection to properly load customers |
| 2026-03-17 | Redesigned invoice creation UI to match POS sale window pattern |
| 2026-03-19 | Added customer statements feature with print and export functionality |
| 2026-03-19 | Fixed product search and filtering in Create Invoice form |
| 2026-03-20 | Created Professional A4 Invoice template with correct field mapping |
| 2026-03-20 | Fixed invoice print - enhanced field mapping, added vatNumber, cleaned debug logs |
| 2026-03-20 | Enhanced invoice print with Subtotal/Tax/Total breakdown and Terms section |

## Notes

The print engine integrates with the existing DocumentTemplate system. Templates can be designed using the document-templates page and then used for printing via the print engine.

Bank details (bankName, bankAccount, bankBranch) and VAT number (vatNumber) can be configured in Settings page and will appear on invoices.
