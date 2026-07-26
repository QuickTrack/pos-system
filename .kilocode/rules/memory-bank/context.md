# Active Context: POS System with Payroll Management Module

## Current State

**Template Status**: ✅ Multi-Terminal Client-Server POS Architecture

Implemented a comprehensive multi-terminal client-server architecture for the QuickTrack POS system:
- Express.js standalone server with Socket.io for real-time communication
- MongoDB models for Terminal, Device, SyncLog, and OfflineQueue
- Client-side server configuration, socket service, and offline mode utilities
- New pages: Setup Wizard, Terminal Management, Server Dashboard, Server Settings
- Terminal management API endpoints in Next.js
- Real-time sync events emitted from sales and product APIs
- IndexedDB-based offline queue for action persistence
- Sidebar navigation updated with Terminal Management group

## Recently Completed

- [x] Multi-Terminal Client-Server POS Architecture
  - **Server Components**: Express.js server in `server/` with Socket.io, MongoDB connection, auth routes, terminal/device/sync/offline-queue/discovery API routes
  - **New Models**: Terminal (status, device registration, metadata), Device (fingerprint, branch, status), SyncLog (event tracking, branch sync), OfflineQueue (pending/processing/completed/failed states)
  - **Frontend Utilities**: `server-config.ts` (get/save/generate IDs), `socket-service.ts` (Socket.io singleton + useSocket hook), `offline-db.ts` (IndexedDB wrapper), `multi-terminal-sync.ts` (emit helpers), `useServerConnection.ts` (online status, pending count, sync queue)
  - **Pages**: `/setup` (setup wizard with server IP/port/branch/terminal name), `/terminals` (terminal management UI), `/server-dashboard` (stats, system status, connected terminals), `/server-settings` (connection config, sync status)
  - **API Routes**: `/api/terminals` GET/POST, `/api/terminals/[id]` GET/PATCH/DELETE, `/api/terminals/[id]/connect` POST, `/api/terminals/[id]/disconnect` POST, `/api/discovery/servers` GET
  - **Real-Time Events**: Sales API emits `sale:completed` events, Products API emits `stock:updated` events via socket-bridge
  - **Offline Mode**: IndexedDB stores pending actions when offline, sync queue processes them on reconnect, notifications for online/offline status
  - **Socket Service**: Client connects to configured server URL, registers terminal, listens for stock/sale/notification events
  - **Discovery**: Server exposes `/api/discovery/servers` endpoint, setup page offers LAN discovery button
  - **Terminal Management Sidebar**: Added Terminal Management group with Terminals and Server Dashboard links
  - `bun typecheck` passed; `bun lint` passed with pre-existing warnings only

- [x] Complete Payroll Management Module
  - **Models** (12): PayrollProfile, SalaryStructure, Earning, Deduction, Advance, Loan, PayrollRun, PayrollItem, Payslip, PayrollJournal, PayrollReport, PayrollApproval
  - **API Routes** (18+): runs, runs/[id], runs/[id]/calculate, runs/[id]/approve, runs/[id]/finalize, runs/[id]/payslips, profile, profile/[id], salary-structures, salary-structures/[id], earnings, deductions, advances, loans, payslips, journals, reports
  - **Tax Calculator**: PAYE 2024/2025 brackets, NSSF (Tier I/II 6%), SHIF (2.75%), Housing Levy (1.5%), full payroll calculation engine
  - **Pages** (10): /payroll (dashboard with charts), /payroll/employees, /payroll/salary-structures, /payroll/earnings, /payroll/deductions, /payroll/runs, /payroll/advances, /payroll/loans, /payroll/payslips, /payroll/reports
  - **Permissions Added**: manage_payroll, process_payroll, view_payroll, manage_employees, manage_advances, manage_loans, manage_payslips
  - **Settings Fields Added**: payrollEnabled, payrollNumber, overtimeMultiplier, maxOvertimeHours, NSSF rate, SHIF rate, Housing Levy rate, PAYE brackets config, etc.
  - `bun typecheck` passed; `bun lint` passed with pre-existing warnings only

- [x] Close Shift Expected Cash refresh fix
  - Fixed opening cash float fields remaining 0 when opening a new shift
  - Added immediate state reset when clicking "No Active Shift" button before modal opens
  - Updated handleOpenShift to treat empty strings as 0 values
  - Added closingFloatCash and closingFloatMpesa to close shift API response for next shift auto-load

- [x] Shift Summary PDF Template Redesign
  - Restructured shift summary PDF template with professional layout
  - Added business header with name, address, phone, email at top
  - Added two-column shift information and business details section
  - Separated data into three distinct tables: Opening Balance, Transaction Summary, Closing Reconciliation
  - Added signature section with lines for cashier and supervisor signatures
  - Added View Summary button in shifts page for closed shifts
  - Added Shift Summary modal with detailed breakdown and Print Summary action
  - Improved data transformation to use separate arrays (openingItems, transactionItems, closingItems)
  - Fixed table right-alignment for proper decimal alignment
  - TypeScript typecheck passed; lint passed with existing warnings only

- [x] Cashier Logout Preserves Original Session
  - Super admin can now log in at `/login`, enter POS, log in as cashier, and when cashier logs out/shift ends, return to `/dashboard` with the original super admin session intact
  - Added `/api/auth/restore-session` endpoint that accepts a `preserveToken` and restores the original `auth-token` httpOnly cookie
  - Modified `/api/auth/cashier-login` to return `preserveToken` (the existing auth-token) in the JSON response before overwriting the cookie
  - Updated `POSAuthModal.tsx` and `/pos/login/page.tsx` to store `preserveToken` in `sessionStorage['pos-preserve-token']`
  - Updated `ShiftStatus.tsx` Logout button to call `/api/auth/restore-session` with the preserved token, then redirect to `/dashboard` with a hard reload so the server reads the restored cookie
  - The "Switch Cashier" button still performs a full logout to `/pos/login`
  - TypeScript typecheck passed; `bun lint` passed with existing warnings only

- [x] License Context 401 Auth Error Fix
  - Fixed `src/lib/license-context.tsx` to gracefully handle 401 Unauthorized responses from `/api/auth/me` and `/api/licenses/validate-hardware` when the user is not authenticated
  - When `/api/auth/me` returns non-ok, license check now stops early instead of continuing to call the protected license validation endpoint
  - When `/api/licenses/validate-hardware` returns non-ok, the error is handled gracefully instead of being parsed as a valid license response
  - Prevents console 401 errors and incorrect redirects to `/license/activate` when user is logged out
  - TypeScript typecheck passed; bun lint passed with existing warnings only

- [x] Cashier Auto-Logout After Shift End
  - Implemented automatic POS logout when a shift is closed (either by the cashier or by a supervisor)
  - Updated `/api/shifts/active` GET to include `cashier` and `cashierName` in the response for ownership verification
  - Updated `useShiftStore.closeShift` to return the full API response including the `autoLogout` flag
  - Updated `ShiftStatusIndicator` to call `logout('/dashboard')` when closing a shift with `autoLogout: true`
  - Added a 30-second polling interval in `POSPage` that checks if the current user's active shift has been externally closed; when detected, it automatically redirects the cashier to `/dashboard`
  - `bun typecheck` passed; `bun lint` passed with existing warnings only.

- [x] POS Shift Status Enhancement
  - Added X-Report button to POS ShiftStatusIndicator, linking to `/reconciliation/x-reads`
  - Added POS session info section on far right showing: computer name (Monitor icon), logged-in user with role badge (User icon), and current date/time (Calendar icon)
  - User role displays "Super-Admin" for super_admin role, otherwise shows the role name
  - Changed End Shift button outline to `!border-red-400` for red styling (overrides btn-outline base)
  - Changed X-Report button outline to `!border-blue-400` for blue styling
  - `bun typecheck` passed

- [x] Customer Payment validation fix
  - Fixed `paymentId` validation error by generating paymentId explicitly in the route before creating CustomerPayment document
  - Removed faulty pre-save hook from CustomerPayment model that wasn't executing before validation
  - Added `getNextPaymentNumber()` helper function to generate sequential `CPAY-XXXXXX` format

- [x] POS UI Styling Updates
  - Changed search bar border to `border-2 border-emerald-400` for bolder green outline
  - Changed cart section border to `border-t-2 border-red-400` for bolder red outline
  - `bun typecheck` passed

- [x] Branches Page Sidebar Layout
  - Created `src/app/branches/layout.tsx` to add Sidebar navigation to `/branches` route
  - Follows same pattern as other authenticated pages (suppliers, customers, etc.)
  - `bun typecheck` passed

- [x] POS Shift Modal Fixes
  - Fixed ShiftStatusIndicator component to use `createPortal` for modals, preventing them from being clipped by parent `overflow-hidden` containers in Next.js App Router.
  - Moved `ShiftStatusIndicator` from global `Header.tsx` to `src/app/pos/page.tsx` so shift modals only appear within the POS module.
  - Added `fetchRegisters`, `registers`, `selectedRegister`, `openingFloat` to Zustand shift store so the "Open New Shift" register dropdown works when triggered from the POS "No Active Shift" overlay.
  - Fixed register dropdown bug where selecting a register had no effect because `fetchRegisters()` was only called in the component's own button, not the overlay button.
  - Removed duplicate "Open New Shift" modal markup from ShiftStatusIndicator; modals now use a single shared store state.
  - `bun typecheck` passed; `bun lint` passed with existing warnings only.

- [x] Close Shift Expected Cash & M-Pesa Balance Calculation
  - Updated Close Shift modal to calculate expected cash and expected M-Pesa balance separately.
  - Expected Cash = openingFloatCash + cashSales - cashDropsTotal - expensesTotal
  - Expected M-Pesa Balance = openingFloatMpesa + mpesaSales
  - Updated `/api/shifts/[id]/close` GET to return expectedCash, expectedMpesa, cashReceived, mpesaReceived
  - Updated `/api/shifts/active` GET to return expectedMpesa
  - Updated Close Shift page UI to display both Expected Cash (blue card) and Expected M-Pesa Balance (purple card) with opening balances and received amounts
  - `bun typecheck` passed; `bun lint` passed with existing warnings only.

- [ ] Reconciliation Layout Sidebar Fix
  - Bug: Expected Cash in Close Shift modal showed stale value (initial opening float) instead of recalculating from sales during the shift.
  - Root cause: `fetchActiveShift()` was only called on component mount; `activeShift.expectedCash` in Zustand store was never refreshed when opening the Close Shift modal.
  - Fix: Added a `useEffect` in `ShiftStatus.tsx` that re-fetches active shift data from `/api/shifts/active` whenever `showCloseModal` becomes `true`. The API recalculates `expectedCash` from sales, mpesa, card, cash drops, and expenses.
  - File changed: `src/components/pos/ShiftStatus.tsx`
  - `bun typecheck` passed; `bun lint` passed with no new warnings.

- [x] Remove /pos/login route
  - Deleted `/src/app/pos/login/page.tsx` and `/src/app/pos/login/layout.tsx`
  - Removed the separate PIN-based cashier quick login page; cashiers now use the email login at `/login` then authenticate via the PIN modal in the POS interface
  - Removed the "Cashier Quick Login" link from `/src/app/login/page.tsx`
  - Removed `/pos/login` from the auth-context.tsx path exclusion list
  - Fixed `AuthCheck` in `src/app/pos/layout.tsx` that was returning `null` for unauthenticated users, causing the login page to appear blank; now redirects unauthenticated users to `/login`
  - `bun typecheck` passed; `bun lint` passed with pre-existing warnings only

- [x] End-of-Day Reconciliation & Z-Read Module
  - Created MongoDB models: Shift, CashDrop, ZRead, Variance, Register
  - Created `/api/shifts` GET list + POST open
  - Created `/api/shifts/[id]/close` GET (expected cash calc) + POST (close)
  - Created `/api/cash-drops` GET list + POST create
  - Created `/api/z-reads` GET list + POST generate (auto-detects variances)
  - Created `/api/variance` GET list + POST create + PATCH approve/reject
  - Created `/api/x-reads` GET interim report
  - Created `/api/reconciliation/dashboard` GET dashboard data
  - Created `/api/reconciliation/cashier-performance` GET performance data
  - Created `/api/registers` GET list + POST create
  - Added `manage_reconciliation` permission to admin, manager, cashier roles
  - Created `/reconciliation` layout with tabbed navigation
  - Built dashboard with sales summary, payment breakdown, cash summary, active shifts, variance alerts
  - Built shifts page with open shift modal and close shift page with cash count
  - Built cash drops page with create modal
  - Built z-reads page with auto-generation from closed shifts
  - Built x-reads page with open shift selector and snapshot display
  - Built variance page with approve/reject workflow
  - Built registers page with CRUD
  - Built cashier performance page with ranked KPIs
  - Added Reconciliation sidebar menu group with 7 items
  - Updated memory bank with module implementation details
  - `bun typecheck` passed; `bun lint` passed with existing warnings only</p>

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

- [x] Expenses List API Fetch Fix
  - Removed unnecessary `User` model population from `/api/expenses` because expense records already store `createdByName`, `approvedByName`, and `rejectedByName`.
  - This avoids runtime population failures when the User model is not registered in the expenses route while keeping branch and category population intact.
  - `bun typecheck` passed; `bun lint` passed with existing warnings only.

- [x] Expense Creation API Serialization Fix
  - Fixed `/api/expenses` POST/GET/PUT serialization for populated Mongoose results so lean query results serialize without calling `.toObject()` on plain objects.
  - Normalized unauthorized/forbidden expense API responses to include `success: false` so the Record Payout form can display the real backend error.
  - `bun typecheck` passed; `bun lint` passed with existing warnings only.

- [x] Expense Categories Fit-to-Screen Layout
  - Reworked `/expense-categories` into a fixed viewport layout with internal scrolling for the hierarchy sidebar and category table.
  - Compacted stats, filters, table rows, and action buttons so the page fits within the app header height on desktop screens.
  - `bun typecheck` passed; `bun lint` passed with existing warnings only.

- [x] Expense Categories Delete Permission Fix
  - Allowed users with the `manage_expenses` permission (`manager` role) to delete expense categories from the category management UI.
  - Kept delete API responses consistent with `success: false` error payloads for clearer UI feedback.
  - `bun typecheck` passed; `bun lint` passed with existing warnings only.

- [x] Expense Categories Create Fix
  - Fixed `/api/expense-categories` serialization for newly created and updated categories so lean Mongoose results serialize without calling `.toObject()` on plain objects.
  - Improved frontend error messages to surface API validation/permission errors instead of the generic create/update/delete message.
  - `bun typecheck` passed; `bun lint` passed with existing warnings only.

- [x] Expense Categories Page Redesign
  - Rebuilt `/expense-categories` with a fresh dashboard-style layout, summary cards, sticky hierarchy sidebar, modern table, status filtering, and improved create/edit modal.
  - Added an authenticated sidebar layout for `/expense-categories` so the page matches other protected app routes.
  - Kept existing CRUD behavior against `/api/expense-categories` for create, edit, delete, and active/inactive toggling.
  - `bun typecheck` passed; `bun lint` passed with existing warnings only.

- [x] Business Payout & Expense Management Module
  - Created Expense and ExpenseCategory MongoDB models with full schema (attachments, payee info, approval workflow)
  - Created `/api/expenses` route supporting GET/POST/PUT/DELETE with approval/rejection workflows, pagination, and filtering
  - Created `/api/expense-categories` route supporting full CRUD for expense categories with parent/child hierarchy
  - Created `/api/expense-dashboard` route returning summary cards, category/payment/branch/trend breakdowns
  - Built Expense Dashboard page with summary cards, charts (category, payment method, branch, monthly trends)
  - Built Expenses list page with search, filters, view details, approve/reject, delete, Excel export
  - Built Record New Payout form page with branch, category, payee info, attachment upload, and approval flow
  - Built Expense Categories management page with create/edit/delete/activate-deactivate
  - Built Expense Reports & Analytics page with overview, category, payment method, branch reports and export
  - Added Expenses menu group to sidebar navigation with Expense Dashboard, Manage Expenses, Record Payout, Categories, Reports
  - Added `manage_expenses` permission to auth system (admin, manager, super_admin roles)
  - `bun typecheck` passed; `bun lint` passed with existing warnings only

- [x] Profit & Loss Report
  - Added API endpoint for profit report type calculating revenue from sales, cost from purchases, and profit margins
  - Profit report shows: Total Revenue, Total Cost, Gross Profit, Net Profit summary cards
  - Bar chart displays daily revenue, cost, and profit trends
  - Detailed table shows daily breakdown with margin percentages
  - Export support for PDF, Excel, and CSV formats
  - `bun typecheck` passed; `bun lint` passed with existing warnings only

- [x] Customer and Inventory Reports
  - Added `/api/reports` customer and inventory report data for `/reports`.
  - Customer report now shows total customers, top customers by revenue, purchases, balance due, and last purchase date.
  - Inventory report now shows total products, inventory value, low-stock/out-of-stock counts, and item stock/status table.
  - `bun typecheck` passed; changed report files passed ESLint with no errors.

- [x] Invoice Printout and Print Invoice Window Alignment
  - Reworked printing to use the current page with a temporary print-only root instead of a separate print window.
  - The printout now uses the same DOM, active app styles, responsive classes, and print CSS as the print invoice preview.
  - Restores the page after print through `afterprint` and timeout cleanup.
  - `bun typecheck` passed; `bun lint` passed with existing warnings only.

- [x] Open Invoice After Quotation Conversion
  - After a quotation is converted to an invoice, the app now navigates to `/create-invoice?invoiceId=...`.
  - The create-invoice page reads the invoice id from the query string and opens the generated invoice view modal.
  - `bun typecheck` passed; `bun lint` passed with existing warnings only.

- [x] Quotation Conversion Credit Limit Warning
  - Changed quotation-to-invoice conversion so exceeding the customer's credit limit no longer blocks conversion.
  - Conversion now returns a credit limit warning with current debt, available credit, invoice amount, and over-limit amount.
  - The quotation detail page displays the warning after successful conversion.
  - `bun typecheck` passed; `bun lint` passed with existing warnings only.

- [x] Analytics Page Data Fetching Fixes
  - Fixed date mutation bug in `/api/analytics` route
  - Replaced mutating `now.setHours/setDate/setMonth/setFullYear` with immutable Date copies
  - Fixed `revenueData` grouping to use year+month composite key (prevents Jan 2025 colliding with Jan 2026)
  - Fixed `topCustomers` aggregation missing `branchFilter` (data leak for non-admin users)
  - Added `$exists` filter after `$unwind` to prevent grouping sales with empty items arrays
  - Added error state with retry button on analytics page
  - Added `src/app/analytics/layout.tsx` with auth guard and sidebar
  - Updated `revenueData` TypeScript type to match new composite key shape
  - TypeScript typecheck passed

- [x] TypeScript Compile Fixes
  - Fixed `FavoriteItem` interface in `src/lib/store.ts` and `Sidebar.tsx` to include optional `iconName` field
  - Resolved Object literal may only specify known properties error

- [x] License File Download Feature
  - Added download license file functionality to license management modal
  - Generates license.txt file with all license details (key, business name, email, type, status, dates, limits, features)
  - Download button added to actions column in license table
  - Professional formatted text file with clear sections and security notice

- [x] Production-Ready Installer Package
  - Created Windows installer script (install.ps1) with automated dependency detection and installation
  - Created Linux/Mac installer script (install.sh) with automated dependency detection and installation
  - Created comprehensive installation guide (INSTALL.md) with step-by-step instructions
  - Created verification scripts (verify.ps1, verify.sh) for post-installation validation
  - Installers detect and install: Node.js, Bun, MongoDB, project dependencies
  - Automated environment configuration (.env.local creation)
  - Database seeding option
  - Startup script generation (start-dev.ps1/sh, start-prod.ps1/sh)
  - System prerequisite checks (disk space, RAM, OS version)
  - Cross-platform support (Windows, macOS, Linux)
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
- [x] POS Customer Selection Button and Modal Improvements
  - Customer button now shows selected state with green border, green background, and green text when a customer is selected; unselected state uses neutral gray styling
  - Added small green indicator dot next to selected customer name for quick visual confirmation
  - Customer modal now includes two dropdown filters above the results list:
    - Customer Type filter: All Types, Retail, Wholesale, Distributor
    - Customer Category filter: All Categories, Individual, Company
  - Customer list cards now display avatar initials circle, name, phone, email, type badge, and category badge
  - Added `Check` icon import for selected-state affordances
  - Added `customerFilter` and `customerCategoryFilter` state to POS page
  - Updated `handleSearchCustomer` to pass `customerType` to `/api/customers` and apply `customerCategory` filtering client-side
  - Modal close and customer selection now reset both filters and clear the results list
  - Search placeholder updated to "Search by name, phone or email..."
  - Empty state copy updated to "Type to search customers" and "No customers found"
  - `bun typecheck` passed; `bun lint` passed with existing warnings only
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
- [x] Unit Conversion Logic for Stock Deduction
  - Fixed stock deduction to use base unit quantity based on conversion rate
  - When selling products with multiple units (e.g., Pack, Carton), system now calculates correct stock deduction
  - Example: If 1 Carton = 50 Packs, selling 1 Carton deducts 50 Packs from stock, not 1
  - Added unitAbbreviation and conversionToBase fields to POS and Create Invoice requests
  - Sales API calculates baseQuantity = quantity * conversionToBase
  - Customer Invoice API calculates baseQuantity similarly
  - Both APIs now deduct from stockQuantity and shopStock fields
  - Updated CustomerInvoice model with baseQuantity, unitAbbreviation, and conversionToBase fields
- [x] Supplier Invoice Reception with Unit Conversion
  - Added unit conversion support to Purchase model (unitName, unitAbbreviation, conversionToBase)
  - Purchase receive API now calculates baseQuantity = receivedQuantity * conversionToBase
  - Stock is updated using base unit quantity for accurate inventory tracking
  - Supplier totalPurchases updated when receiving invoices (accumulates invoice total)
  - Supplier balance updated when payments are recorded
  - Added supplierDebt to dashboard API for "Total Amount Owed to Suppliers" statistic
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
  - Added onboarding link in Settings page Security tab
  - Clicking sets localStorage onboarding-complete to true
  - Redirects directly to dashboard bypassing onboarding wizard
- [x] Receive Order Modal Unit Column
  - Added dedicated "Unit" column to items table in receive order modal
  - Displays measurement unit for each item (e.g., pcs, kg, liters)
  - Added unitName and unitAbbreviation fields to PurchaseItem interface
  - Unit information automatically populated from purchase order data
  - Improves clarity and inventory tracking for received items
- [x] Supplier Invoices Management Module
  - Created SupplierInvoice model with full schema (items, payments, status tracking)
  - Created supplier invoices API routes (GET, POST, payment recording)
  - Created supplier invoices page with comprehensive UI
  - Features: invoice creation, payment tracking, status management, print support
  - Added Supplier Invoices to sidebar navigation
  - Supports multiple payment methods (cash, bank transfer, M-Pesa, cheque, card)
  - Invoice statuses: draft, pending approval, approved, partially paid, paid, overdue
  - Integrated with inventory and supplier management
- [x] Supplier Invoices Bug Fix - Existing Supplier Recognition
  - Fixed issue where loading a pending order showed "Add new supplier" for existing suppliers
  - Added fetchSuppliers() call in handleSelectPurchaseOrder before opening modal
  - Ensures suppliers list is loaded before supplier name matching occurs
- [x] Focus-Based Dropdown Closure for Search Components
  - Added onBlur handlers to all search inputs in supplier-invoices and purchases pages
  - Product search inputs now close dropdown on blur with 200ms delay
  - Purchase order search input now closes dropdown on blur with 200ms delay
  - Added onMouseDown={(e) => e.preventDefault()} to all dropdown items
  - Prevents blur event from firing before click event on dropdown items
  - Updated dropdown rendering to use showProductDropdown and showPoDropdown states
  - Consistent behavior across supplier search, product search, and purchase order search
- [x] Create Supplier Invoice Layout Reorganization
  - Moved Invoice Details section above the items table on the right side
  - Created side-by-side grid layout for Product Search (left) and Invoice Details (right)
  - Uses responsive grid: single column on mobile, two columns on large screens (lg:grid-cols-2)
  - Items table now appears below the top section
- [x] Auto-Set Due Date for Supplier Invoices
  - Added useEffect to automatically set due date to 30 days after invoice date
  - When invoice date changes, due date is automatically calculated and updated
  - Uses formData.invoiceDate as dependency to trigger updates
- [x] Supplier Invoices Bug Fix - Existing Supplier Recognition
  - Fixed issue where loading a pending order showed "Add new supplier" for existing suppliers
  - Root cause: handleSelectPurchaseOrder was not awaiting fetchSuppliers() before opening modal
  - Suppliers list was not loaded when modal opened, causing supplier name matching to fail
  - Fixed by making handleSelectPurchaseOrder async and awaiting fetchSuppliers() call
  - Modal now opens only after suppliers list is fully loaded
  - Supplier name matching now works correctly for existing suppliers
- [x] Supplier Payments Invoice Selection Modal Bug Fix
  - Fixed function name mismatch in InvoiceSelectionModal component integration
  - Changed `handleInvoiceSelect` to `handleInvoiceSelection` in supplier-payments page
  - Modal now correctly calls the invoice selection handler when invoices are selected
  - Fixed API endpoint mismatch - modal was fetching from `/api/supplier-invoices` but should use `/api/purchases/supplier-invoices`
  - Added data transformation to convert purchase order data to Invoice interface format
  - TypeScript typecheck passed with no errors
- [x] Supplier Payment Modal Enhancements
  - Set default payment date to today's date
  - Added 'Cheque' as new payment mode option
  - Made 'Cheque' the pre-selected default payment mode when modal loads
  - Added conditional input fields for Cheque payment mode (cheque number, bank name, bank branch)
  - Added conditional input field for M-Pesa payment mode (M-Pesa transaction ID)
  - Updated SupplierPayment model with new fields: chequeNumber, bankName, bankBranch, mpesaTransactionId
  - Updated supplier-payments API to handle new fields
  - Updated supplier-invoices API to automatically update invoice status to 'paid' when payment is recorded
  - Supplier balance is automatically recalculated and updated when payment is recorded
- [x] Invoice Selection Modal Data Fix
  - Fixed InvoiceSelectionModal to fetch from `/api/supplier-invoices` instead of `/api/purchases/supplier-invoices`
  - Invoice details (including items) now match what's shown in main Supplier Invoices modal
  - Added status filter to only show unpaid/partially paid invoices
  - Invoice data transformation now properly includes items array
- [x] Supplier Invoice Status Default Fix
  - Changed default status from 'draft' to 'unpaid' when creating new supplier invoices
  - Ensures invoices are properly marked as unpaid until payment is recorded
  - Added 'unpaid' to SupplierInvoice model status enum
  - Fixed frontend SupplierInvoice interface to include 'unpaid' in status type
  - Added 'unpaid' status to getStatusBadge function with orange styling
  - Added 'Unpaid' option to status filter dropdown
  - Fixed unescaped entities lint error in supplier-invoices page
  - Fixed InvoiceSelectionModal to include 'unpaid' in status filter
  - Added 'unpaid' option to status filter dropdown in InvoiceSelectionModal
  - Added 'unpaid' to getStatusBadge function in InvoiceSelectionModal
- [x] Invoice Selection Modal API Fix
  - Fixed InvoiceSelectionModal to fetch from correct API endpoint
  - API now handles comma-separated status values using MongoDB $in operator
  - Modal sends status filter: 'unpaid,pending_approval,approved,partially_paid,overdue'
  - API correctly parses comma-separated values and queries database
- [x] Supplier Payments API Field Name Fix
  - Fixed /api/supplier-payments to accept both 'supplier' and 'supplierId' field names
  - Frontend sends 'supplierId' but API was expecting 'supplier'
  - Resolves issue where Record Payment button was not working
- [x] Disable Edit for Paid Invoices
  - Added disabled prop to edit button when invoice status is 'paid'
  - Prevents editing of invoices that have been fully paid
- [x] Root Page Redirect to License Activation
  - Modified src/app/page.tsx to redirect to /license/activate on app launch
  - Replaced welcome/landing page with automatic redirect
  - Shows loading spinner during redirect
  - Ensures license activation is the first page users see
  - Added conditional logic to check authentication and license status
  - Super admins redirect to dashboard directly
  - Users with valid license redirect to dashboard
  - Users without valid license redirect to license activation
  - Updated license activation page to check for valid license and redirect to dashboard
  - Fixed license validation to only call API when user is authenticated
  - Added proper error handling for license validation failures
- [x] Sidebar Menu Reorganization
  - Grouped related functions into collapsible categories
  - Sales: POS, Cash Sales, Invoices, Payments, Returns
  - Purchases: Purchases, Invoices, Payments
  - Inventory: Inventory, Stock Transfers
  - Parties: Customers, Suppliers
  - Reports & Analytics
  - Administration: Branches, Users, Licenses, Settings
  - Added MenuGroupItem component for collapsible sections
  - Groups auto-expand when containing active page
  - Single-item groups render directly without collapse
- [x] Clear All System Data Button
  - Created /api/settings/clear-data endpoint with super admin authorization
  - Added multi-step confirmation modal with warning about irreversible action
  - Button only visible to super_admin users in Settings > Security tab
  - Requires typing 'DELETE ALL DATA' to confirm
  - Preserves User, Branch, Settings, License, and Session models
  - Forces full application reload on success
- [x] Training Mode System
  - Created comprehensive training mode with isolated demo database
  - Mode toggle system (Live Mode / Training Mode) with visual indicator banner
  - Pre-loaded realistic dummy data: products, customers, suppliers, sales, purchases, invoices
  - Guided learning experience with step-by-step interactive tutorials
  - Tutorials for: Creating a sale, Adding inventory, Generating invoices, Recording payments, Viewing reports
  - Reset & replay functionality to restore demo data to default state
  - Restricted actions in training mode: real payments, email/SMS sending, printing official documents
  - Activity simulation engine generating daily sales trends, stock movements, customer interactions
  - Role-based training flows for Admin, Cashier, and Store Manager roles
  - UI/UX improvements: Practice Mode badges, Help assistant chatbot
  - Analytics & progress tracking: completed tutorials, user engagement, completion certificates
  - Training mode context provider with localStorage persistence
  - Training banner component showing mode status and progress
  - Tutorial engine with step-by-step guidance and element highlighting
  - Simulation engine for generating realistic business activity
  - Role-based permissions and training content filtering
  - Help assistant with contextual guidance and FAQ
  - Progress dashboard with completion metrics and achievements
- [x] License Key Validation in License Management Modal
  - Added validation logic to POST endpoint in /api/licenses/route.ts for new license generation
  - Added validation logic to PATCH endpoint for license upgrades and downgrades
  - Validates license key format using validateLicenseKeyFormat()
  - Validates license type from key matches requested type using getLicenseTypeFromKey()
  - Checks for duplicate license key in database before saving
  - Returns clear error messages if validation fails
- [x] Header Component License Status Synchronization Enhancement
  - Fixed React hooks rules violation - removed try/catch around useLicense() hook
  - Implemented lazy localStorage initialization to prevent stale null render on mount
  - Added corrupted data handling with automatic cleanup of invalid localStorage entries
  - Eliminated race conditions between context sync and localStorage loading effects
  - Fixed lastChecked to not create new Date on every render (prevents unnecessary re-renders)
  - Added useLicenseSafe() helper for graceful handling when LicenseProvider is not available
  - Added loadLicenseFromStorage() helper with data validation and error recovery
  - Used useRef to track context sync state and prevent overwriting loaded data
  - TypeScript typecheck passed with no errors

- [x] Supplier Invoice Add Products Spacing
  - Reduced vertical spacing around the Add Products section in the supplier invoice create/edit modal.
  - Tightened form, grid, card, heading, and search wrapper spacing to remove extra blank space above and below the section.
  - `bun typecheck` passed; `bun lint` passed with existing warnings only.

- [x] Supplier Invoice Numeric Field Zero Reset
  - Supplier invoice item numeric fields now accept blank strings while editing.
  - Quantity, unit cost, discount, and tax inputs reset to blank on focus when their value is 0.
  - Numeric calculations use a safe numeric helper so blank fields do not break totals.
  - `bun typecheck` passed; `bun lint` passed with existing warnings only.

- [x] Supplier Invoice Product Search Fix
  - Supplier invoice page now fetches products on page load so product search can query the database.
  - Product search dropdown now opens while the user types and collapses after product selection.
  - Supplier and purchase order selection flows now refresh products before filtering product options.
  - `bun typecheck` passed; `bun lint` passed with existing warnings only.

- [x] Supplier Invoice Create Modal Layout
  - Moved Invoice Details section below the Items table in the supplier invoice create/edit modal.
  - Invoice Details fields now render in one desktop row using a four-column responsive grid.
  - `bun typecheck` passed; `bun lint` passed with existing warnings only.

- [x] Supplier Dropdown Sorting
  - Supplier invoice supplier dropdown now sorts fetched suppliers alphabetically by name.
  - Filtered supplier dropdown results are also sorted alphabetically for consistent ordering.
  - `bun typecheck` passed; `bun lint` passed with existing warnings only.

- [x] Supplier Invoice Dropdown Collapse Behavior
  - Product dropdown now remains collapsed by default and when product search is empty.
  - Product dropdown collapses immediately after selecting a product.
  - Supplier dropdown already collapses on supplier selection; product dropdown also collapses when supplier/Purchase Order selection changes.
  - `bun typecheck` passed; `bun lint` passed with existing warnings only.

- [x] Supplier Payments Navigation Link
  - Added a visible "Supplier Payments" button on the Supplier Invoices page toolbar.
  - Link redirects to `/supplier-payments` using Next.js `Link` and matches existing outline button styling.
  - `bun typecheck` passed; `bun lint` passed with existing warnings only.

- [x] Sales Page Receipt Template Enhancement
  - Added business information fields from settings to PrintPreview for sales receipts: businessName, businessTagline, businessAddress, businessPhone, businessEmail, vatNumber, logo, receiptFooter
  - Fixed invoice number to use actual sale invoiceNumber instead of _id or receiptNumber
  - Added cashier name to receipt footer in PrintPreview
  - Added Unit of Measure column to view receipt modal items table
  - `bun typecheck` passed

- [x] Quick Cashier Login Feature
  - Added `/pos/login` page with numeric PIN keypad interface
  - Added `/api/auth/cashier-login` endpoint for PIN-based authentication
  - Searches all active cashiers and validates PIN against stored bcrypt hash
  - Creates session record with `isQuickLogin` flag
  - Logs activity for successful and failed PIN attempts
  - POS layout redirects unauthenticated users to `/pos/login`
  - Added `isQuickLogin` field to Session model
  - Modified ActivityLog to allow null user for failed attempts
  - Added "Cashier Quick Login" link to main login page
  - `bun typecheck` passed

- [x] POS Exclusive Login & Role Separation
  - Modified POS layout to restrict access to cashiers only
  - Super admins and other roles redirected to `/dashboard` when accessing POS
  - Logout from POS redirects to `/dashboard` instead of `/login`
  - Added `router` import and logout redirect logic to auth-context
  - Sidebar logout button detects POS path and redirects to dashboard
  - Ensures sales transactions are attributed to the logged-in cashier
  - `bun typecheck` passed

- [x] Sidebar Sales Link Addition
  - Added "Sales" menu item to Sales group in Sidebar.tsx to navigate to `/sales` page
  - Uses BarChart3 icon and `manage_sales` permission
  - `bun typecheck` passed

- [x] Receipt Template Column Order Change
  - Changed receipt table columns to: Item, Qty, Unit, Price, Amount order
  - `bun typecheck` passed

- [x] Supplier Invoice Supplier Filter

- [x] Supplier Invoice Inventory Updates
  - Supplier invoice creation now increments `stockQuantity` and `shopStock` for each received item using base-unit conversion.
  - Supplier invoice deletion now reverses the stock increment to keep inventory consistent.
  - `bun typecheck` passed; `bun lint` passed with existing warnings only.

- [x] Auto-Generate Supplier Invoice Numbers
  - Added `/api/supplier-invoices?next=true` endpoint to return the next numeric supplier invoice number.
  - Create Supplier Invoice modal now auto-fills the next invoice number when opened.
  - Backend still generates a number if the invoice number field is left blank.
  - `bun typecheck` passed; `bun lint` passed with existing warnings only.

- [x] Supplier Invoice Creation Validation
  - Added backend validation for supplier invoice creation inputs: valid supplier, duplicate invoice number, purchase order ID, invoice date, and item quantities/costs/taxes.
  - Normalized item product IDs before saving to prevent generic 500 errors during invoice creation.
  - Frontend now displays backend error details when supplier invoice creation fails.
  - `bun typecheck` passed; `bun lint` passed with existing warnings only.

- [x] Quotation Product Search Focus Retention
  - Product search input now retains focus after selecting a product from the dropdown
  - `bun typecheck` passed; `bun lint` passed with existing warnings only

- [x] Quotation Tax Inclusive Default
  - Changed quotation tax inclusive checkbox default to checked
  - `bun typecheck` passed; `bun lint` passed with existing warnings only

- [x] Quotation Print Preview Cleanup
  - Hid app header, sidebar, action buttons, status badges, and generated footer in print preview
  - Removed per-item discount and tax columns from the quotation print layout
  - Hid zero-value discount and tax rows from totals
  - Replaced hardcoded quotation header with business settings where available
  - `bun typecheck` passed; `bun lint` passed with existing warnings only

- [x] Quotation to Invoice Conversion
  - Added `convert_to_invoice` action to quotation actions API
  - Added invoice source tracking fields for quotation-originated invoices
  - Added quotation detail conversion modal with invoice date, due date, payment terms, status, notes, and terms
  - Preserves quotation customer, line items, totals, tax, branch, and source quotation number on the created invoice
  - Validates expired quotations, duplicate invoice numbers, missing customers/items, modified quotations, and sent-invoice stock availability.
  - Allows credit-limit exceedance during conversion and returns a warning instead of rejecting the request.
  - `bun typecheck` passed; `bun lint` passed with existing warnings only

- [x] Quotation Save and Save & Send Fix
  - Added frontend validation and visible save/send feedback on the quotation new page
  - API now generates quotation numbers and fills salesperson/branch fields automatically
  - Save & Send now stores `sentAt` when status is `sent`
  - `bun typecheck` passed; `bun lint` passed with existing warnings only

- [x] Quotation New Page Sidebar Cleanup
  - Removed the sidebar Customer card above Summary while keeping the inline customer selector before Save Draft
  - `bun typecheck` passed; `bun lint` passed with existing warnings only

- [x] Quotation New Page Customer Selector and Tax Inclusive Control
  - Added inline searchable customer dropdown before the Save Draft action
  - Customer selection updates `formData.customer` before draft/save workflows
  - Added tax inclusive checkbox that updates existing item tax types and new item defaults
  - `bun typecheck` passed; `bun lint` passed with existing warnings only

- [x] Quotation New Page Layout and Customer Selection Restore
  - Made the Items section full-width on the quotation creation page
  - Restored customer selection with a searchable modal and selected-customer summary card
  - Kept item table columns responsive with a minmax product column
  - `bun typecheck` passed; `bun lint` passed with existing warnings only

- [x] Quotations New Page JSX Fix
  - Fixed corrupted JSX structure in `src/app/quotations/new/page.tsx`
  - Summary and Details cards were outside the grid layout due to misplaced closing tags
  - Wrapped cards in proper `lg:col-span-1` sidebar column for correct 3-column layout

- [x] License Key Regeneration System

- [x] Create Invoice Page Sidebar Navigation
  - Created layout.tsx for /create-invoice route
  - Wraps page with AuthProvider, LicenseProvider, and Sidebar component
  - Sidebar now appears on the create-invoice page consistent with other authenticated pages
  - TypeScript typecheck and lint passed

- [x] License Verification Frequency
  - Changed license sync interval from 30 seconds to once per day (24 hours)
  - Cache duration also set to 24 hours to match
  - Significantly reduces API calls and improves performance
  - Users can still manually trigger sync via the sync button in header

- [x] Hardware License Validation Once Per Day
  - Added `shouldRevalidate()` function in system-license-storage.ts
  - Checks lastValidated timestamp and only revalidates if 24+ hours have passed
  - Returns cached success response if within 24 hours (still checks for suspended/expired)
  - API returns `cached: true` and `lastValidated` timestamp in response
  - Works in conjunction with client-side 24-hour cache
  - Added concurrent check protection to prevent duplicate API calls
  - Removed 24-hour polling interval (only checks on mount and manual trigger)
  - Added 24-hour throttle to visibility change handler
  - Added throttle in auth-context.tsx to skip validation within 24 hours

- [x] Added Sidebar to All Authenticated Pages
  - Created layout.tsx for all main authenticated routes: dashboard, pos, sales, cash-sales, customer-payments, sales-returns, purchases, supplier-invoices, supplier-payments, inventory, customers, suppliers, reports, analytics
  - Each layout wraps pages with LicenseProvider and AuthCheck component with Sidebar
  - TypeScript typecheck passed

- [x] Business Settings Payment Method Fields
  - Added Payment Method Settings subsection to the Business tab with Till, Send Money Phone Number, Bank, and Bank Account Details fields.
  - Persisted new settings fields through the existing `/api/settings` flow and localStorage settings state.
  - Extended Settings model and print data paths so payment method fields are available to invoice templates.
  - Added fallbacks for legacy localStorage settings that do not include `paymentMethods`.
  - `bun typecheck` passed; `bun lint` passed with existing warnings only.

- [x] Customer Invoice Template Enhancements
  - Reformatted detailed tax summary as a horizontal card row below the subtotal/grand total block so the main totals remain visually anchored.
  - Added the configured till number to the payment information section.
  - Removed the accepted payment methods section from customer invoice print preview.
  - Added formal Invoice Notes and Terms and Conditions sections to customer invoice print preview.
  - Added `acceptedPaymentMethods` to Settings model/API state and Business Settings payment method fields.
  - `bun typecheck` passed; `bun lint` passed with existing warnings only.

- [x] Customer Balance Due Calculation Logic
  - Added `balanceDue` to the Customer model as the persisted cumulative outstanding balance.
  - Added shared balance calculation helper that sums unpaid customer invoices, account sales, and general paid customer payments, then floors the result at zero.
  - Wired balance recalculation into customer invoice create/update/payment/delete flows, account sale creation, customer payment recording, and customer debt API responses.
  - Updated customer payment and invoice UIs to read outstanding balance from `balanceDue` instead of store credit.
  - Reduced Detailed Tax Summary amount values to small template text size.
  - `bun typecheck` passed; `bun lint` passed with existing warnings only.

- [x] Customer Invoice Template Cumulative Balance Due
  - Changed the `/customers` page Balance column to use `balanceDue` as the cumulative outstanding balance source.
  - Updated `/api/customers` to return recalculated `balanceDue` for each customer.
  - Captured selected customer balance due at invoice creation time and persisted it on `CustomerInvoice.customerBalanceDue`.
  - Updated the customer invoice print template Detailed Tax Summary Balance Due card to display the invoice-time cumulative customer balance due via `customerBalanceDue`.
  - `bun typecheck` passed; `bun lint` passed with existing warnings only.

- [x] Customer Invoice Balance Due Source of Truth
  - Made customer invoice creation recalculate `customerBalanceDue` on the server from the same historical balance helper used by the `/customers` page Balance column.
  - Updated invoice edit and print flows to prefer the invoice-time `customerBalanceDue` snapshot instead of falling back to the invoice's own outstanding balance.
  - Updated the invoice print template to render the cumulative customer balance due from the snapshot or customer balance fields only.
  - `bun typecheck` passed; `bun lint` passed with existing warnings only.

- [x] Invoice Generation Balance Due Snapshot Fix
  - Changed customer invoice creation to persist `customerBalanceDue` as the customer's cumulative outstanding balance after the new invoice is generated.
  - Updated invoice send/edit flows so `customerBalanceDue` is recalculated at generation time instead of remaining zero for newly created invoices.
  - Updated invoice print preview fallback handling so existing invoices with a zero snapshot can still render the customer's current cumulative balance when the invoice itself is outstanding.
  - `bun typecheck` passed; `bun lint` passed with existing warnings only.

- [x] Invoice Print Preview and Printed Output Alignment
  - Updated invoice printing to copy the full preview A4 document DOM instead of only its inner HTML.
  - Injected the active application stylesheets into the print window so printed invoices use the same Tailwind/global styles as the preview.
  - Removed the external Tailwind CDN dependency from the print path and waited for local images/styles before calling `print()`.
  - Replaced iterable stylesheet collection with indexed access to avoid Turbopack/runtime `StyleSheetList` iteration errors.
  - `bun typecheck` passed; `bun lint` passed with existing warnings only.

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
| `src/models/Settings.ts` | Settings with bank and payment method fields | ✅ Updated |

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
| 2026-07-23 | Implemented Multi-Terminal Client-Server POS Architecture: Express.js server in `server/` with Socket.io, MongoDB models (Terminal, Device, SyncLog, OfflineQueue), frontend utilities (server-config, socket-service, offline-db, useServerConnection), pages (/setup, /terminals, /server-dashboard, /server-settings), terminal management API endpoints, real-time sync events from sales/products APIs, IndexedDB offline queue, LAN discovery, and sidebar navigation updates. `bun typecheck` passed; lint passed with pre-existing warnings only |
| 2026-07-23 | Auto-approve and auto-receive stock transfers on creation in `/api/stock-transfers` POST - deducts source stock, adds destination stock, creates StockAudit logs, sets status to `received`. `bun typecheck` passed; lint passed |
| 2026-07-23 | Added stock transfer print form component `src/components/stock-transfers/StockTransferForm.tsx` with A4 invoice-style layout, business settings header, location details, items table, and print support. After creation, stock transfers automatically open the generated form |
| 2026-07-23 | Replaced hardcoded `QuickTrack InfoSystems ERP` in stock transfer form template with dynamic business information from `/api/settings` (`businessName`, `businessTagline`, `businessAddress`, `businessPhone`, `businessEmail`) |
| 2026-03-29 | Implemented license key regeneration system with individual and bulk regeneration support, audit logging, and regeneration history tracking |
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
| 2026-03-28 | Fixed supplier invoices API to use user-entered invoice number instead of auto-generating one |
| 2026-03-28 | Implemented full editing functionality for Supplier Invoices - PUT API endpoint, edit button, modal repurposing, pre-filled data |
| 2026-03-29 | Fixed InvoiceSelectionModal API - added comma-separated status filter support using MongoDB $in operator |
| 2026-03-29 | Fixed supplier payments API to accept both supplier and supplierId fields |
| 2026-03-29 | Disabled edit button for paid invoices in supplier-invoices page |
| 2026-03-29 | Reorganized sidebar menu with logical categories (Sales, Purchases, Inventory, Parties, Reports, Administration) |
| 2026-03-29 | Added Clear All System Data button for super admins with multi-step confirmation |
| 2026-03-29 | Added license key validation in License Management modal - validates format, type, and uniqueness before saving |
| 2026-03-29 | Enhanced Header component license status synchronization - fixed hooks rules violation, implemented lazy localStorage initialization, added corrupted data handling, eliminated stale renders |
| 2026-03-29 | Implemented stock validation in POS sales interface - prevents adding out-of-stock products to cart, displays error modal with admin password override for admin/super_admin users |
| 2026-04-07 | Added sidebar to create-invoice and all other authenticated pages by creating layout.tsx files |
| 2026-04-07 | Renamed Revenue to Sales in dashboard Performance Overview |
| 2026-04-07 | Changed license verification to happen once per day (24 hours) instead of every 30 seconds |
| 2026-04-07 | Added hardware license validation caching - API only revalidates once per day, returns cached response otherwise |
| 2026-06-14 | Added Payment Method Settings subsection to Business Settings with Till, Send Money Phone Number, Bank, and Bank Account Details fields; persisted fields through Settings model/API/localStorage; exposed fields in invoice print data and PrintPreview; enhanced customer invoice template with detailed tax summary, accepted payment methods from business settings, custom invoice notes, and formal terms and conditions sections; reworked customer balance due calculation with shared helper and persisted Customer.balanceDue; reduced Detailed Tax Summary amount font sizes |
| 2026-06-14 | Updated customer invoice print template to show the customer's cumulative outstanding balance due from the `/customers` page Balance column, captured at invoice generation time and persisted on CustomerInvoice.customerBalanceDue |
| 2026-06-14 | Made customer invoice Balance Due display use the invoice-time cumulative customer balance due snapshot calculated from the same customer balance helper as the `/customers` page Balance column; removed invoice balance fallback from the tax summary rendering path |
| 2026-06-14 | Fixed customer invoice Balance Due snapshots to include the newly generated invoice total so newly created invoices no longer print with a zero cumulative customer balance |
| 2026-06-14 | Aligned printed invoice output with the print preview by printing the full preview A4 DOM with the active application stylesheets instead of using an external Tailwind CDN copy |
| 2026-06-14 | Fixed print stylesheet collection to use indexed `StyleSheetList` access so invoice printing works under Next.js/Turbopack without iterable runtime errors |
| 2026-06-15 | Fixed `/api/expenses` list loading by removing unnecessary User model population from the route |
| 2026-06-15 | Fixed expense creation/update/list serialization in `/api/expenses` and normalized auth errors for clearer Record Payout feedback |
| 2026-06-15 | Fixed invoice print-window formatting by printing from the active app DOM and live styles instead of reconstructing a separate print window document |
| 2026-06-15 | Aligned invoice preview and print rendering by removing preview scaling and using the same A4 dimensions, zero page margin print CSS, and preview DOM for printing |
| 2026-06-15 | Fixed customer invoice printing by switching print document replacement to `beforeprint`/`afterprint` lifecycle handling and passing `customerBalanceDue` into the print preview data |
| 2026-06-15 | Made the customer invoice print action visible as a labeled `Print` button and changed the print options menu to open on click instead of hover |
| 2026-06-15 | Added a visible `Print Invoice` button to the customer invoice view modal so viewed invoices can open the print preview flow directly |
| 2026-06-15 | Reworked customer invoice printing to use a dedicated print window populated with the exact preview DOM, active app stylesheets, and image load waiting before invoking `print()` |
| 2026-06-15 | Fixed invoice footer positioning by making the A4 print page container relatively positioned so the footer anchors to the page bottom |
| 2026-06-15 | Compacted the invoice detailed tax summary print layout to reduce unnecessary vertical space |
| 2026-06-15 | Aligned invoice printout with the print invoice window by using a temporary same-document print root with the active app styles |
| 2026-06-15 | Removed the accepted payment methods section from customer invoice print preview |
| 2026-06-15 | Allowed quotation-to-invoice conversion to exceed customer credit limits while returning and displaying a warning |
| 2026-06-15 | Opened the generated customer invoice view modal after successful quotation-to-invoice conversion |
| 2026-06-15 | Fixed Product Performance report - updated API to return topProducts with revenue/profit from sales data, added conditional rendering for products report type in frontend, added product-specific summary cards and table view |
| 2026-06-15 | Reworked the Expense Categories page into a fixed viewport layout with internal scrolling for the hierarchy sidebar and category table |
| 2026-06-15 | Allowed manager users to delete expense categories and kept delete API errors consistent with the UI error handling |
| 2026-06-15 | Fixed expense category creation/update serialization in `/api/expense-categories` and surfaced backend API errors in the category UI |
| 2026-06-15 | Redesigned the Expense Categories page with summary cards, a sticky hierarchy sidebar, modern table UI, improved create/edit modal, and an authenticated sidebar layout; validation passed with existing lint warnings only |
| 2026-06-25 | Fixed Close Shift Expected Cash refresh - added useEffect to re-fetch active shift data when modal opens so expectedCash reflects current sales |
| 2026-06-28 | Added POS Exclusive Login - POS layout restricts to cashiers only, super admins redirected to dashboard; logout from POS redirects to dashboard |
| 2026-07-03 | Fixed LicenseProvider 401 Unauthorized errors - added graceful auth check handling in license-context.tsx so unauthenticated users don't trigger protected license API calls or incorrect redirects |
| 2026-07-03 | Added cashier logout session preservation - `/api/auth/cashier-login` returns original auth token, `/api/auth/restore-session` restores it, POS Logout button in ShiftStatus now returns to dashboard with original super admin session intact |
| 2026-06-28 | Added Quick Cashier Login page with numeric PIN keypad; `/api/auth/cashier-login` validates PIN and creates session |
| 2026-07-05 | Fixed POS-created expenses not properly deducted in shift calculations - added shift field to Expense model, updated API endpoints to link expenses to shifts and filter by shift in expected cash/M-Pesa calculations |
| 2026-07-05 | Added automatic cashier summary report printing upon shift close - ShiftSummary document type with detailed breakdown, triggered via print preview in POS and reconciliation close shift pages |
| 2026-07-06 | Implemented complete Payroll Management Module: 12 MongoDB models, 18+ API routes with Kenyan tax calculator (PAYE/NSSF/SHIF/Housing Levy), 10 frontend pages (dashboard with charts, employees, salary structures, earnings, deductions, runs, advances, loans, payslips, reports), Role-based permissions, Settings fields. `bun typecheck` passed; `bun lint` passed with existing warnings only |
| 2026-07-06 | Implemented Payroll Salary Structures & Runs pages: `src/app/payroll/salary-structures/page.tsx`, `src/app/payroll/runs/page.tsx`, salary-structures CRUD API, runs calculate/approve/finalize action endpoints, extended SalaryStructure model with rate field and category enum |
| 2026-07-06 | Created earnings and deductions frontend pages for Payroll Management Module with full CRUD, tabbed filtering, stats cards, DataTable, and modals |
| 2026-07-06 | Implemented Payroll Management Module API: Kenyan tax calculator + 18 payroll route files (runs, calculate, approve, finalize, payslips, profile, salary-structures, earnings, deductions, advances, loans, payslips, journals, reports) |
| 2026-06-15 | Added Customer Report and Inventory Report support to `/reports` with API aggregations, summary cards, tables, and export data |

## Notes

The print engine integrates with the existing DocumentTemplate system. Templates can be designed using the document-templates page and then used for printing via the print engine.

Bank details (`bankName`, `bankAccount`, `bankBranch`) and payment method details (`paymentTill`, `sendMoneyPhoneNumber`) can be configured in Settings > Business > Payment Method Settings and will appear on invoices.
