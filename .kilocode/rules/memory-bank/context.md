# Active Context: POS System with License Management

## Current State

**Template Status**: ✅ Multi-User Authentication with Session Management

Implemented complete multi-user authentication system:
- Session model for tracking active user sessions
- Sessions API endpoint for viewing/managing sessions
- Login API creates session records on successful authentication
- Logout API cleans up sessions
- Concurrent session limit (default: 3 devices per user)
- Automatic activity logging for key actions (login, logout, sales, products)
- Session management UI in Settings page
- When product is selected via Enter key, quantity input is focused and text selected
- When Enter is pressed in quantity field, focus returns to product search
- Tab key triggers checkout (when cart has items)
- In payment modal: Tab cycles through payment methods, Enter completes sale
- After sale complete: Enter key triggers print receipt

## Recently Completed

- [x] Base Next.js 16 setup with App Router
- [x] TypeScript configuration with strict mode
- [x] Tailwind CSS 4 integration
- [x] ESLint configuration
- [x] Memory bank documentation
- [x] Recipe system for common features
- [x] Purchases Page Enhancements
  - Fixed supplier selection to use correct state variable (newSupplierData)
  - Made supplier field wider in the form
  - Auto-select newly created supplier and focus product search
  - Added Unit column to products section with proper unit selection from product's baseUnit and additional units
  - Added Cheque payment option to payment method dropdown
  - Added print functionality for purchase orders with PrintPreview component
  - Added validation for required fields (supplier and products) before submission
  - Fixed productDetails storage to preserve baseUnit and units for each item
  - Added 'cheque' to Purchase model paymentMethod enum
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
- [x] Customer Credit Payment Feature
  - POS payment modal added credit payment method option
  - Customer credit balance displayed in POS payment modal
  - Credit automatically applied up to available balance or total
  - Remaining balance shown after credit applied
  - Sales API updated to deduct credit balance for credit payments
  - Customer payments page credit balance display and validation
  - Credit balance included in customer invoices API response
  - API validates credit balance before applying (uses available balance if insufficient)
- [x] Credit Balance vs Credit Limit Clarification
  - creditBalance: Store credit (positive balance from overpayments, returns) - used to pay for new purchases
  - creditLimit: Maximum allowable debt - prevents customer from overborrowing on account
  - Fixed Sales API to NOT increase creditBalance for account payments
  - Fixed Customer Invoice creation API to NOT increase creditBalance
  - Fixed Customer Invoice payment API to only decrease creditBalance for 'credit' payment method
  - Fixed Customer Payment record API to only decrease creditBalance for 'credit' payment method
  - POS shows creditLimit when making account payments for reference
- [x] Credit Limit Validation for Account Payments
  - Sales API validates credit limit before creating account payments
  - Customer Invoices API validates credit limit before creating sale invoices
  - Calculates current outstanding balance from unpaid invoices and account sales
  - Rejects transaction if new debt would exceed creditLimit
  - Returns clear error with currentDebt, creditLimit, availableCredit, and wouldExceedBy
- [x] Receipt Template Font Size Adjustments
  - Reduced QR code size by 50% (from 200px to 60px)
  - Increased all font sizes by one point:
    - text-[10px] → text-[11px] (Invoice Summary, Terms, Notes, Payment Info, Status)
    - text-[8px] → text-[9px] (KRA QR caption)
  - Applied to PrintPreview receipt template
- [x] POS Cart Section Fixed Height
  - Removed dynamic resize functionality (isDragging, resize handle)
  - Applied fixed height CSS rule: `h-[calc(100vh-150px)]`
  - Cart fills remaining vertical space below search/filter area
  - Height persists across page reloads (no localStorage needed - fixed CSS)
  - Cart items container uses `overflow-y-auto` with `min-h-0` for proper scrolling
- [x] Settings Persistent Storage (localStorage)
  - Settings saved to localStorage on save (key: 'pos-settings')
  - Settings loaded from localStorage on page load as fallback
  - Applied to: Settings page, POS page, Create Invoice page
  - Provides offline persistence and faster initial load
- [x] Receipt VAT Calculation Fix
  - Receipt generator now calculates VAT from individual items
  - For each item: extracts VAT using formula (amount - amount/1.16)
  - Total VAT = sum of all individual item VAT amounts
  - Total shown at receipt footer (Taxable Amount and VAT lines)
  - Per-item VAT display removed (not shown in item details)
- [x] Onboarding Wizard Implementation
  - Created comprehensive multi-step onboarding wizard at /onboarding
  - 7-step wizard: Business Profile, Tax Config, Currency/Region, Invoice Numbering, Payment Methods, Receipt/Printing, Opening Balances
  - Progress persistence using localStorage
  - Skip optional steps functionality
  - Redirects to onboarding on first login (checks localStorage)
  - Auto-redirect to dashboard after completion
  - Card component updated to support children in CardHeader
- [x] License System Implementation
  - License model for database storage (src/models/License.ts)
  - License API routes: generate, activate, validate, renew
  - License key generator (POS-XXXX-XXXX-XXXX-XXXX format)
  - License activation page (/license/activate)
  - Admin license management page (/licenses)
  - License check on application startup (redirects if invalid/expired)
  - License status display in header (days remaining, warnings)
  - Supports trial (14 days), annual, and lifetime licenses
- [x] Dashboard RecentSale Type Fix
  - Added status property to RecentSale interface in dashboard page
  - Fixes TypeScript errors for sales status display
- [x] Cash Sales Data Retrieval Fix
  - Fixed API route model imports to use models index
  - Changed import from individual model imports to barrel export import
  - Fixed MissingSchemaError for User and Branch models in /api/sales
  - Fixed same issue in /api/dashboard route
  - Added proper error handling in cash-sales page
- [x] Receipt Generator VAT-Inclusive Prices
  - Modified createReceiptData to properly reverse-calculate base amount and VAT from VAT-inclusive totals
  - Fixed formula: baseAmount = total / (1 + taxRate/100), vatAmount = total - baseAmount
  - Display rate shows as-is (already VAT-inclusive when includeInPrice is true)
  - Updated subtotal to show VAT-inclusive total when includeInPrice is true
  - Hidden taxable amount and VAT rows when prices are already inclusive
- [x] Cash Sales Page Error Display Fix
  - Added error state display to cash-sales page
  - Error messages now show when API fails (401 Unauthorized, network errors, etc.)
  - Added retry button to reload data after errors
- [x] POS Page TypeScript Fix
  - Fixed shorthand property errors for includeInPrice in M-Pesa payment handlers
  - Changed from `includeInPrice,` to `includeInPrice: businessSettings.includeInPrice,`
- [x] POS Cart VAT Calculation Fix
  - Changed calculateTotals to always calculate tax as 16% of (subtotal - discount) for display
  - Total now equals (subtotal - discount) - no additional VAT added on top
  - Prevents customer overcharging when product prices are already VAT-inclusive
- [x] Receipt Generator Item Total Fix
  - Item amounts now calculated as straightforward QTY * RATE multiplication
  - No hidden VAT calculations or adjustments on individual line items
  - Updated createReceiptData in receipt-generator.ts
  - Updated sales API route to use simple calculation for item totals
- [x] Cash Sale Sequential Numbering
  - Added cashSalePrefix and cashSaleNumber fields to Settings model
  - Created generateCashSaleNumber function in utils.ts
  - Cash sales now use format CSH-00001 with auto-incrementing
  - Account/credit sales continue to use INV-YYYYMMDD-#### format
- [x] Purchases Page Auto-Focus Supplier Selection
  - Added supplierSelectRef to reference the supplier dropdown
  - Added useEffect to auto-focus on supplier select when create modal opens
  - Uses 100ms delay to ensure modal is fully rendered before focusing
- [x] License Pricing Page
  - Created /pricing page with license options
  - Three plans: Trial (14 days free), Annual ($199/year), Lifetime ($499 one-time)
  - Updated "Get one here" button on license activation page to link to /pricing
- [x] M-Pesa Payment Page
  - Created /payment page with M-pesa payment details
  - Till No: 649469, Contact: 0720086614
  - Currency displayed in KSH (Kenyan Shillings)
  - Shows selected plan and amount
  - Includes payment instructions
  - Updated pricing page "Get Started" buttons to navigate to /payment
- [x] License Activation Auto-Population from Onboarding
  - License activation page at /license/activate?plan=trial now auto-populates business info
  - Retrieves business data from onboarding localStorage (onboarding-progress)
  - Retrieves business data from Settings localStorage (pos-settings)
  - Retrieves business data from Settings API
  - Maps: businessName, businessPhone, businessEmail, businessAddress, taxNumber, industry
  - Trial plan: license key field hidden/bypassed (no license key required)
  - Trial plan: redirects to /login after activation instead of /dashboard
  - Validates required fields (businessName, email, phone) before activation
  - Added new fields to License model: address, taxNumber, industry, contactPerson
  - License activation API updated to handle trial plan without authentication
- [x] License Upgrade Functionality
  - Added PUT method to /api/licenses route for upgrading trial licenses
  - Generates new license key for upgraded license
  - Tracks upgrade history in license document
  - Added upgrade button in licenses management page UI
  - Upgrade modal with plan selection (Annual $199 or Lifetime $499)
- [x] Super Admin License Bypass
  - Modified auth-context.tsx to check user role before license validation
  - Super admins bypass license validation during authentication
  - Super admins can access system even with expired/invalid license
  - License validation API updated to return bypass status for super admins
  - License warnings still displayed but don't block access
  - Bypass only applies to authentication - other operations still require valid license
- [x] Real-Time License Status Synchronization
  - Created LicenseProvider context for centralized license state management
  - Polling mechanism checks for license status every 30 seconds (configurable)
  - License validation caching with 10-second cache duration
  - Cross-tab communication via localStorage storage events
  - Automatic license refresh when window gains focus
  - Manual sync button in header for immediate refresh
  - When license is upgraded, localStorage is updated for instant sync across tabs
  - Sync interval can be adjusted via setSyncInterval() function
- [x] License Management Actions (Upgrade, Downgrade, Suspend, Restore)
  - Added PATCH API endpoint for license actions
  - Upgrade: Change from trial to paid (annual/lifetime)
  - Downgrade: Change from paid to lower tier (lifetime→annual, annual→trial)
  - Suspend: Mark license as suspended with reason, restricts access
  - Restore: Reactivate suspended license
  - All actions update localStorage for instant UI sync
  - Added action buttons in licenses management page UI
  - Confirmation modals with warnings for destructive actions
- [x] Header Component Bug Fix
  - Fixed duplicate/misplaced JSX closing tags causing build error
  - Added missing lastChecked state variable for license sync display
  - Fixed title attribute syntax for license status link
- [x] License Activation Form Validation Enhancement
  - Updated submit button disabled state to check all required fields
  - Button now disabled when businessName, email, or phone are empty (for all plans)
  - For non-trial plans, also checks that licenseKey is not empty
- [x] Dual Location Inventory Management
  - Added shopStock and remoteStock fields to Product model
  - Added lowStockThresholdShop and lowStockThresholdRemote for per-location thresholds
  - Inventory page now displays stock levels for both Shop and Remote locations
- [x] Stock Transfer System
  - Created StockTransfer model with transfer workflow (Pending → Approved → In Transit → Received/Rejected)
  - Created Stock Transfer API endpoints (GET, POST, PATCH)
  - Created stock transfers page at /stock-transfers with full UI
  - Transfers validate stock availability at source location before creation
  - Stock automatically deducted from source when shipped, added to destination when received
  - Partial receive supported
- [x] Stock Audit Trail
  - Created StockAudit model for tracking all stock movements
  - Records: product, quantity before/after, location, movement type, user, reference
  - Movement types: purchase, sale, transfer_out, transfer_in, adjustment, return, damage, opening_balance
  - Created /api/stock-audit endpoint for viewing audit logs
- [x] Purchase Receiving with Location Selection
  - Updated purchase receive API to accept location parameter (shop or remote)
  - Stock added to selected location only
  - Audit logs created for each received item with location info
- [x] Stock Transfers Sidebar Navigation
  - Added Stock Transfers link to sidebar navigation
- [x] Product Units Enhancement
  - Added Base Unit with Price section in edit product form
    - Shows base unit name with inline price editing
    - Uses retailPrice as base unit price
    - Real-time validation for positive numbers
  - Enhanced Additional Units section with inline price editing
    - Price field with step=0.01, min=0 for precise pricing
    - Real-time validation prevents negative prices
    - Auto-converts invalid input to 0
  - Updated Product interface in inventory page to include baseUnit and units fields
  - Fixed product units not saving issue using useRef
    - Added productUnitsRef to reliably track units data
    - Updated addProductUnit, removeProductUnit, updateProductUnit to sync with ref
    - Updated handleSubmit to use ref for units data
  - POS already supports unit prices from API (Product.units array with price field)
  - Product units are properly saved/loaded via products API
- [x] Manual Quantity Editing in Cart Sections
  - POS page cart items now have manually editable quantity input fields
  - Create Invoice page cart items now have manually editable quantity input fields
  - Users can type quantities directly instead of relying solely on +/- buttons
  - Quantity changes reflect immediately in line totals
- [x] Keyboard Navigation for Quantity Fields
  - When product is selected via Enter key, quantity input is focused and text selected
  - When Enter is pressed in quantity field, focus returns to product search
  - Forward slash (/) key triggers checkout when cart has items
  - In payment modal: Tab cycles through payment methods, Enter completes sale
  - After sale complete: Enter key triggers print receipt
- [x] Receipt Sale Return Label
  - Modified receipt generator to display "SALE RETURN" instead of "RECEIPT" for refund transactions
  - Distinguishes between regular sales and returns in printed receipts
- [x] POS Customer Creation
  - Added "Create New Customer" button that appears when no customers found
  - Created Add Customer modal with form (name, phone, email, address, type, category)
  - Added business name and KRA PIN fields for company customers
  - Added credit limit field
  - Validates required fields (name, phone) before submission
  - Auto-selects newly created customer after successful creation
  - Error handling with user-friendly messages
  - Reuses existing /api/customers POST endpoint
- [x] Modal Close on Overlay Behavior
  - Changed default closeOnOverlayClick to false
  - Modals now stay open when clicking outside
  - Users must explicitly close with X button or Cancel button
- [x] POS Credit Limit Error Display
  - Added paymentError and creditLimitInfo state for tracking credit limit errors
  - Added credit limit error display in payment modal with detailed breakdown
  - Shows: Credit Limit, Current Debt, Sale Amount, Available Credit, Would Exceed By
  - Professional error message with red styling and AlertTriangle icon
  - Clears error when modal closes or payment method changes
  - Simplified error message: "Credit limit Exceeded, use other payment mode"
  - Fixed undefined variable bugs (customer → selectedCustomer in payment modal)
  - Fixed button disabled condition for account payment to use selectedCustomer
  - Fixed credit limit error detection to check error message case-insensitively
- [x] Invoice and Delivery Note Unit Display
  - Added unitName field to CustomerInvoice model and schema
  - Create Invoice page passes unit to print documents (unit: item.unitName)
  - PrintPreview already displays unit column for items
  - Units (kg, pieces, liters, boxes, etc.) now appear in printed invoices and delivery notes
- [x] TypeScript Fixes
  - Added includeInPrice and paymentTerms to Invoice interface in create-invoice page
  - Added includeInPrice to Invoice interface in sales-returns page
  - Fixed paymentTerms type handling in setPaymentTerms call
  - Fixed customer-payments route to use paymentMethod instead of non-existent paymentStatus
- [x] Invoice Unit Display Fix
  - Added unit transformation in handlePrintInvoice to convert unitName to unit for PrintPreview
  - Added unit transformation after invoice creation to convert unitName to unit
  - Added fallback: unit: (item as any).unitName || (item as any).unit || '-' in PrintPreview data mapping
  - Units now properly display in printed invoices and delivery notes
- [x] Onboarding Skip Option
  - Added "Skip onboarding setup" link on login page
  - Added Skip All button on onboarding page after step 0
  - Added Back button always visible
  - Clicking sets localStorage onboarding-complete to true
  - Redirects directly to dashboard bypassing onboarding wizard

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
| 2026-03-21 | Implemented customer credit payment feature - auto-apply credit balance in POS and customer payments |
| 2026-03-22 | POS cart fixed height CSS rule; Settings persistent storage with localStorage |
| 2026-03-23 | Fixed receipt to always display Taxable Amount and VAT (16%) - removed conditional rendering |
| 2026-03-22 | Implemented license activation auto-population from onboarding data |
| 2026-03-22 | Added license upgrade functionality for trial licenses |
| 2026-03-22 | Added super admin license bypass - super admins can access system regardless of license status |
| 2026-03-22 | Implemented real-time license status synchronization with polling mechanism |
| 2026-03-22 | Added license downgrade, suspend, and restore actions |
| 2026-03-24 | Implemented multi-user authentication with session management - Session model, Sessions API, concurrent session limits, automatic activity logging for login/logout/sales/products, session management UI in Settings |
| 2026-03-23 | Added manual quantity editing in cart sections with keyboard navigation |

## Notes

The print engine integrates with the existing DocumentTemplate system. Templates can be designed using the document-templates page and then used for printing via the print engine.

Bank details (bankName, bankAccount, bankBranch) and VAT number (vatNumber) can be configured in Settings page and will appear on invoices.
