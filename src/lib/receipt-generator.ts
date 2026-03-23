/**
 * ESC/POS Receipt Generator for 80mm Thermal Printers
 * 
 * Generates formatted receipt HTML optimized for 80mm thermal printers
 * with proper tax calculations for Kenyan VAT requirements.
 */

import QRCode from 'qrcode';
import { generateKRAQRData, calculateTaxableAmount, calculateVAT } from './kra-qr-generator';

export interface ReceiptBusiness {
  name: string;
  tagline?: string;
  address?: string;
  phone?: string;
  email?: string;
  vatNumber?: string;
  kraPin?: string;
  includeInPrice?: boolean;
}

export interface ReceiptItem {
  name: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface ReceiptData {
  invoiceNumber: string;
  date: string;
  business: ReceiptBusiness;
  customer?: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  items: ReceiptItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  taxableAmount: number;
  discount: number;
  total: number;
  paymentMethod: string;
  amountPaid: number;
  change: number;
  cashierName: string;
  includeInPrice?: boolean;
  isRefund?: boolean;
}

/**
 * Format currency for Kenyan Shillings
 */
export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
  if (isNaN(num)) return 'KES 0.00';
  return 'KES ' + num.toFixed(2);
}

/**
 * Format number with 2 decimal places (no currency symbol)
 */
export function formatNumber(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
  if (isNaN(num)) return '0.00';
  return num.toFixed(2);
}

/**
 * Format date for receipt
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format time for receipt
 */
export function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Pad text to fit 80mm column width (approximately 48 characters)
 */
function padText(text: string, length: number, align: 'left' | 'right' | 'center' = 'left'): string {
  const textStr = String(text);
  if (textStr.length >= length) {
    return textStr.substring(0, length);
  }
  const padding = ' '.repeat(length - textStr.length);
  switch (align) {
    case 'right':
      return padding + textStr;
    case 'center':
      const leftPad = Math.floor(padding.length / 2);
      return ' '.repeat(leftPad) + textStr + ' '.repeat(padding.length - leftPad);
    default:
      return textStr + padding;
  }
}

/**
 * Truncate text with ellipsis if too long
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Generate formatted item line for receipt
 * Format: Item Name | Unit | Qty | Rate | Total
 */
function formatItemLine(item: ReceiptItem, maxNameLength: number = 22): string {
  const name = truncateText(item.name, maxNameLength);
  const unit = item.unit || 'pcs';
  const qty = item.quantity.toString();
  const rate = formatCurrency(item.rate);
  const amount = formatCurrency(item.amount);
  
  // Format: name | unit | qty | rate | amount
  // Using space-padded columns
  const namePad = maxNameLength - name.length;
  const unitPad = 6 - unit.length;
  const qtyPad = 4 - qty.length;
  const ratePad = 10 - rate.length;
  
  return (
    name + ' '.repeat(namePad) +
    ' ' + unit + ' '.repeat(unitPad) +
    ' ' + qty + ' '.repeat(qtyPad) +
    ' ' + rate + ' '.repeat(ratePad) +
    amount
  );
}

/**
 * Generate receipt HTML styled for 80mm thermal printer
 */
export async function generateThermalReceiptHTML(data: ReceiptData): Promise<string> {
  const year = new Date().getFullYear();
  
  const taxRate = data.taxRate || 16;
  // Check includeInPrice from data first, then from business settings
  const includeInPrice = data.includeInPrice ?? data.business.includeInPrice ?? false;
  
  let taxAmount: number;
  let taxableAmount: number;
  const total = data.total;
  
  // Calculate VAT for each item and total VAT
  let totalVATFromItems = 0;
  let totalNetFromItems = 0;
  
  if (data.items && data.items.length > 0) {
    for (const item of data.items) {
      // Calculate VAT from item amount (prices may be VAT-inclusive or exclusive)
      // For VAT-inclusive: VAT = amount - (amount / 1.16), Net = amount / 1.16
      // For VAT-exclusive: VAT = amount * 0.16, Net = amount
      let itemNet: number;
      let itemVAT: number;
      
      if (includeInPrice) {
        // Prices include VAT - extract the net and VAT portions
        itemNet = item.amount / (1 + taxRate / 100);
        itemVAT = item.amount - itemNet;
      } else {
        // Prices are VAT-exclusive
        itemNet = item.amount;
        itemVAT = item.amount * (taxRate / 100);
      }
      
      totalVATFromItems += itemVAT;
      totalNetFromItems += itemNet;
    }
  }
  
  // Calculate totals based on whether prices include VAT
  if (includeInPrice) {
    // Prices are VAT-inclusive (total is the gross amount)
    // taxableAmount is the net amount before VAT
    // taxAmount is the VAT portion
    taxAmount = totalVATFromItems;
    taxableAmount = totalNetFromItems;
  } else {
    // Prices are VAT-exclusive
    taxAmount = totalVATFromItems || ((data.subtotal - data.discount) * taxRate / 100);
    taxableAmount = totalNetFromItems || (data.subtotal - data.discount);
  }
  
  // Generate KRA QR Code
  let qrCodeDataUrl = '';
  if (data.business.kraPin && data.invoiceNumber) {
    try {
      const kraData = {
        sellerPin: data.business.kraPin,
        invoiceNumber: data.invoiceNumber,
        dateOfIssue: data.date,
        taxableAmount: Math.round(taxableAmount * 100) / 100,
        vatAmount: Math.round(taxAmount * 100) / 100,
        totalAmount: Math.round(total * 100) / 100,
        invoiceType: 'RECEIPT'
      };
      
      const qrData = generateKRAQRData(kraData);
      qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 40,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      });
    } catch (error) {
      console.error('Failed to generate KRA QR code:', error);
    }
  }
  
  // Generate HTML receipt
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt - ${data.invoiceNumber}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      line-height: 1.2;
      width: 76mm;
      margin: 0 auto;
      padding: 2mm;
    }
    
    .receipt {
      width: 100%;
    }
    
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }
    
    .font-bold { font-weight: bold; }
    .uppercase { text-transform: uppercase; }
    
    .business-name {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 2px;
    }
    
    .business-tagline {
      font-size: 9px;
      margin-bottom: 4px;
    }
    
    .divider {
      border-top: 1px dashed #333;
      margin: 4px 0;
    }
    
    .divider-double {
      border-top: 1px dashed #333;
      border-bottom: 1px dashed #333;
      margin: 4px 0;
      padding: 2px 0;
    }
    
    .item-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }
    
    .item-name {
      flex: 0 0 45%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .item-details {
      flex: 0 0 50%;
      text-align: right;
    }
    
    .totals-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }
    
    .totals-row.grand-total {
      font-size: 13px;
      font-weight: bold;
      border-top: 1px solid #333;
      padding-top: 4px;
      margin-top: 4px;
    }
    
    .footer-text {
      font-size: 9px;
      margin-bottom: 2px;
    }
    
    .qr-section {
      text-align: center;
      margin-top: 6px;
    }
    
    .qr-section img {
      width: 25mm;
      height: auto;
    }
    
    .item-header-row {
      display: flex;
      font-size: 8px;
      font-weight: bold;
      margin-bottom: 3px;
      padding-bottom: 2px;
      border-bottom: 1px dashed #999;
    }
    
    .item-header-row span:first-child {
      flex: 0 0 20%;
    }
    
    .item-header-row span:nth-child(2) {
      flex: 0 0 25%;
    }
    
    .item-header-row span:nth-child(3) {
      flex: 0 0 25%;
      text-align: right;
    }
    
    .item-header-row span:nth-child(4) {
      flex: 0 0 30%;
      text-align: right;
    }
    
    .item-main {
      margin-bottom: 1px;
    }
    
    .item-name-full {
      font-weight: bold;
      font-size: 10px;
    }
    
    .item-details-row {
      display: flex;
      font-size: 9px;
      margin-bottom: 3px;
    }
    
    .item-qty {
      flex: 0 0 20%;
    }
    
    .item-unit {
      flex: 0 0 25%;
    }
    
    .item-rate {
      flex: 0 0 25%;
      text-align: right;
    }
    
    .item-amount {
      flex: 0 0 30%;
      text-align: right;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="receipt">
    <!-- Business Header -->
    <div class="text-center">
      ${data.business.name ? `<div class="business-name">${data.business.name.toUpperCase()}</div>` : ''}
      ${data.business.tagline ? `<div class="business-tagline">${data.business.tagline}</div>` : ''}
      ${data.business.address ? `<div>${data.business.address}</div>` : ''}
      ${data.business.phone ? `<div>Tel: ${data.business.phone}</div>` : ''}
      ${data.business.email ? `<div>${data.business.email}</div>` : ''}
      ${data.business.vatNumber ? `<div>VAT No: ${data.business.vatNumber}</div>` : ''}
      ${data.business.kraPin ? `<div>PIN: ${data.business.kraPin}</div>` : ''}
    </div>
    
    <div class="divider"></div>
    
    <!-- Receipt Info -->
    <div class="text-center">
      <div class="font-bold">${data.isRefund ? 'SALE RETURN' : 'RECEIPT'}</div>
      <div>No: ${data.invoiceNumber}</div>
      <div>${formatDate(data.date)} ${formatTime(data.date)}</div>
    </div>
    
    <div class="divider"></div>
    
    <!-- Customer Info -->
    ${data.customer ? `
    <div>
      <div><strong>CUSTOMER DETAILS</strong></div>
      <div>Name: ${data.customer.name}</div>
      ${data.customer.phone ? `<div>Phone: ${data.customer.phone}</div>` : ''}
      ${data.customer.email ? `<div>Email: ${data.customer.email}</div>` : ''}
      ${data.customer.address ? `<div>Address: ${data.customer.address}</div>` : ''}
    </div>
    <div class="divider"></div>
    ` : ''}
    
    <!-- Items Header -->
    <div class="item-header-row">
      <span>ITEM/QTY</span>
      <span>UNITS</span>
      <span>RATE</span>
      <span>AMOUNT</span>
    </div>
    
    <!-- Items with nested layout -->
    <div class="divider-double">
      ${data.items.map(item => {
        // Display rate as-is: when includeInPrice is true, rate is already VAT-inclusive
        // when false, rate is VAT-exclusive (base price)
        const displayRate = item.rate;
        return `
        <div class="item-main">
          <div class="item-name-full">${truncateText(item.name, 35)}</div>
        </div>
        <div class="item-details-row">
          <span class="item-qty">${item.quantity}</span>
          <span class="item-unit">${item.unit || 'pcs'}</span>
          <span class="item-rate">@${formatNumber(displayRate)}</span>
          <span class="item-amount">${formatNumber(item.amount)}</span>
        </div>
      `;}).join('')}
    </div>
    
    <!-- Totals -->
    <div class="divider"></div>
    
    <div class="totals-row">
      <span>Subtotal${includeInPrice ? ' (incl. VAT)' : ''}:</span>
      <span>${formatCurrency(includeInPrice ? data.items.reduce((sum, item) => sum + item.amount, 0) : data.subtotal)}</span>
    </div>
    
    ${data.discount > 0 ? `
    <div class="totals-row">
      <span>Discount:</span>
      <span>-${formatCurrency(data.discount)}</span>
    </div>
    ` : ''}
    
    <div class="totals-row">
      <span>Taxable Amount:</span>
      <span>${formatCurrency(taxableAmount)}</span>
    </div>
    
    <div class="totals-row">
      <span>VAT (${taxRate}%):</span>
      <span>${formatCurrency(taxAmount)}</span>
    </div>
    
    <div class="totals-row grand-total">
      <span>TOTAL:</span>
      <span>${formatCurrency(total)}</span>
    </div>
    
    <div class="divider"></div>
    
    <!-- Payment Details -->
    <div class="totals-row">
      <span>Paid (${data.paymentMethod}):</span>
      <span>${formatCurrency(data.amountPaid)}</span>
    </div>
    
    ${data.change > 0 ? `
    <div class="totals-row">
      <span>Change:</span>
      <span>${formatCurrency(data.change)}</span>
    </div>
    ` : ''}
    
    <div class="divider"></div>
    
    <!-- Footer -->
    <div class="text-center">
      <div class="footer-text">${includeInPrice ? 'Prices inclusive of VAT' : 'Prices exclusive of VAT'}</div>
      <div class="footer-text">Served by: ${data.cashierName}</div>
      <div class="footer-text">Goods once sold cannot be returned</div>
      <div class="footer-text">Powered by Quicktrack ERP ${year}</div>
    </div>
    
    <!-- QR Code -->
    ${qrCodeDataUrl ? `
    <div class="qr-section">
      <div class="footer-text">KRA Tax Compliance</div>
      <img src="${qrCodeDataUrl}" alt="KRA QR Code" />
      <div class="footer-text">Scan to verify</div>
    </div>
    ` : ''}
    
    <div class="text-center" style="margin-top: 8px;">
      *** THANK YOU FOR YOUR BUSINESS ***
    </div>
  </div>
</body>
</html>
  `.trim();
  
  return html;
}

/**
 * Create receipt data from sale object and business settings
 */
export function createReceiptData(
  sale: any,
  business: ReceiptBusiness,
  cashierName: string
): ReceiptData {
  const taxRate = sale.taxRate || 16;
  
  // Check if prices include VAT (from business settings or sale metadata)
  const includeInPrice = business.includeInPrice ?? false;
  
  // Calculate totals - item amounts are now straightforward QTY * RATE
  let subtotal: number;
  let taxAmount: number;
  let taxableAmount: number;
  
  // Subtotal is the sum of item amounts (QTY * RATE for each item)
  subtotal = (sale.items || []).reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
  
  // Calculate tax as 16% of (subtotal - discount) for display purposes
  const discount = sale.discountAmount || 0;
  taxableAmount = subtotal - discount;
  taxAmount = (taxableAmount * taxRate) / 100;
  
  // Total is subtotal minus discount (no additional VAT added)
  const total = taxableAmount;

  const items: ReceiptItem[] = (sale.items || []).map((item: any) => ({
    name: item.productName || 'Item',
    unit: item.unitAbbreviation || item.unitName || 'pcs',
    quantity: item.quantity,
    rate: item.unitPrice,
    // Item amount is straightforward QTY * RATE (no hidden calculations)
    amount: item.quantity * item.unitPrice
  }));
  
  return {
    invoiceNumber: sale.invoiceNumber || '',
    date: sale.saleDate || new Date().toISOString(),
    business,
    customer: sale.customerName ? {
      name: sale.customerName,
      phone: sale.customerPhone,
      email: sale.customerEmail,
      address: sale.customerAddress
    } : undefined,
    items,
    subtotal,
    taxRate,
    taxAmount,
    taxableAmount,
    discount: sale.discountAmount || 0,
    total,
    paymentMethod: sale.paymentMethod || 'cash',
    amountPaid: sale.amountPaid || 0,
    change: sale.change || 0,
    cashierName,
    includeInPrice,
    isRefund: sale.isRefund || false
  };
}

/**
 * Open print dialog for receipt
 */
export function printReceipt(html: string): void {
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  }
}
