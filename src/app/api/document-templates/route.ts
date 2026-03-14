import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import DocumentTemplate from '@/models/DocumentTemplate';
import { getAuthUser } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';

// Built-in templates
const BUILT_IN_TEMPLATES = [
  {
    name: 'Retail POS Receipt 58mm',
    description: 'Standard 58mm thermal printer receipt for retail sales',
    category: 'receipt' as const,
    pageSize: '58mm' as const,
    orientation: 'portrait' as const,
    margins: { top: 5, right: 5, bottom: 5, left: 5 },
    elements: [
      { id: 'logo', type: 'image', src: '{{business.logo}}', x: 14, y: 5, width: 30, height: 30, textAlign: 'center' },
      { id: 'business_name', type: 'text', content: '{{business.name}}', x: 0, y: 40, width: 58, height: 15, fontSize: 10, fontWeight: 'bold', textAlign: 'center' },
      { id: 'business_address', type: 'text', content: '{{business.address}}', x: 0, y: 55, width: 58, height: 12, fontSize: 8, textAlign: 'center' },
      { id: 'business_contact', type: 'text', content: '{{business.phone}}', x: 0, y: 67, width: 58, height: 10, fontSize: 8, textAlign: 'center' },
      { id: 'divider1', type: 'divider', x: 0, y: 82, width: 58, height: 5, lineStyle: 'dashed' },
      { id: 'invoice_label', type: 'text', content: 'INVOICE: {{invoice.number}}', x: 0, y: 90, width: 29, height: 10, fontSize: 8 },
      { id: 'date', type: 'text', content: '{{invoice.date}}', x: 29, y: 90, width: 29, height: 10, fontSize: 8, textAlign: 'right' },
      { id: 'customer', type: 'text', content: '{{customer.name}}', x: 0, y: 100, width: 58, height: 10, fontSize: 8 },
      { id: 'items_header', type: 'text', content: '--------------------------------', x: 0, y: 115, width: 58, height: 8, fontSize: 8, textAlign: 'center' },
      { id: 'items_table', type: 'table', source: 'items', x: 0, y: 125, width: 58, height: 200, columns: [
        { key: 'name', title: 'Item', width: 25 },
        { key: 'quantity', title: 'Qty', width: 8, align: 'center' as const },
        { key: 'price', title: 'Price', width: 12, align: 'right' as const },
        { key: 'total', title: 'Total', width: 13, align: 'right' as const }
      ]},
      { id: 'divider2', type: 'divider', x: 0, y: 330, width: 58, height: 5, lineStyle: 'dashed' },
      { id: 'subtotal_label', type: 'text', content: 'Subtotal:', x: 0, y: 340, width: 35, height: 10, fontSize: 8 },
      { id: 'subtotal', type: 'text', content: '{{invoice.subtotal}}', x: 35, y: 340, width: 23, height: 10, fontSize: 8, textAlign: 'right' },
      { id: 'tax_label', type: 'text', content: 'Tax:', x: 0, y: 350, width: 35, height: 10, fontSize: 8 },
      { id: 'tax', type: 'text', content: '{{invoice.tax}}', x: 35, y: 350, width: 23, height: 10, fontSize: 8, textAlign: 'right' },
      { id: 'total_label', type: 'text', content: 'TOTAL:', x: 0, y: 365, width: 35, height: 12, fontSize: 10, fontWeight: 'bold' },
      { id: 'total', type: 'text', content: '{{invoice.total}}', x: 35, y: 365, width: 23, height: 12, fontSize: 10, fontWeight: 'bold', textAlign: 'right' },
      { id: 'divider3', type: 'divider', x: 0, y: 385, width: 58, height: 5, lineStyle: 'dashed' },
      { id: 'footer', type: 'text', content: 'Thank you for shopping!', x: 0, y: 395, width: 58, height: 10, fontSize: 8, textAlign: 'center' }
    ],
    isBuiltIn: true,
    isDefault: true
  },
  {
    name: 'Retail POS Receipt 80mm',
    description: 'Standard 80mm thermal printer receipt for retail sales',
    category: 'receipt' as const,
    pageSize: '80mm' as const,
    orientation: 'portrait' as const,
    margins: { top: 5, right: 5, bottom: 5, left: 5 },
    elements: [
      { id: 'logo', type: 'image', src: '{{business.logo}}', x: 22, y: 5, width: 36, height: 36, textAlign: 'center' },
      { id: 'business_name', type: 'text', content: '{{business.name}}', x: 0, y: 50, width: 80, height: 18, fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
      { id: 'business_address', type: 'text', content: '{{business.address}}', x: 0, y: 68, width: 80, height: 14, fontSize: 10, textAlign: 'center' },
      { id: 'business_contact', type: 'text', content: '{{business.phone}} | {{business.email}}', x: 0, y: 82, width: 80, height: 12, fontSize: 9, textAlign: 'center' },
      { id: 'kra_pin', type: 'text', content: 'PIN: {{business.kraPin}}', x: 0, y: 94, width: 80, height: 10, fontSize: 8, textAlign: 'center' },
      { id: 'divider1', type: 'divider', x: 0, y: 110, width: 80, height: 5, lineStyle: 'solid' },
      { id: 'invoice_info', type: 'text', content: 'Invoice: {{invoice.number}}    Date: {{invoice.date}}    Cashier: {{cashier.name}}', x: 0, y: 120, width: 80, height: 12, fontSize: 9 },
      { id: 'customer_info', type: 'text', content: 'Customer: {{customer.name}}    {{customer.phone}}', x: 0, y: 132, width: 80, height: 10, fontSize: 8 },
      { id: 'divider2', type: 'divider', x: 0, y: 148, width: 80, height: 3, lineStyle: 'dashed' },
      { id: 'items_header', type: 'text', content: 'Item', x: 5, y: 158, width: 35, height: 10, fontSize: 9, fontWeight: 'bold' },
      { id: 'items_header_qty', type: 'text', content: 'Qty', x: 40, y: 158, width: 12, height: 10, fontSize: 9, fontWeight: 'bold', textAlign: 'center' },
      { id: 'items_header_price', type: 'text', content: 'Price', x: 52, y: 158, width: 13, height: 10, fontSize: 9, fontWeight: 'bold', textAlign: 'right' },
      { id: 'items_header_total', type: 'text', content: 'Total', x: 65, y: 158, width: 15, height: 10, fontSize: 9, fontWeight: 'bold', textAlign: 'right' },
      { id: 'items_table', type: 'table', source: 'items', x: 0, y: 172, width: 80, height: 250, columns: [
        { key: 'name', title: 'Item', width: 35 },
        { key: 'quantity', title: 'Qty', width: 12, align: 'center' as const },
        { key: 'price', title: 'Price', width: 13, align: 'right' as const },
        { key: 'total', title: 'Total', width: 15, align: 'right' as const }
      ]},
      { id: 'divider3', type: 'divider', x: 0, y: 430, width: 80, height: 3, lineStyle: 'dashed' },
      { id: 'subtotal_row', type: 'text', content: 'Subtotal:', x: 40, y: 440, width: 20, height: 12, fontSize: 10, textAlign: 'right' },
      { id: 'subtotal_val', type: 'text', content: '{{invoice.subtotal}}', x: 60, y: 440, width: 20, height: 12, fontSize: 10, textAlign: 'right' },
      { id: 'tax_row', type: 'text', content: 'Tax ({{invoice.taxRate}}%):', x: 40, y: 452, width: 20, height: 12, fontSize: 10, textAlign: 'right' },
      { id: 'tax_val', type: 'text', content: '{{invoice.tax}}', x: 60, y: 452, width: 20, height: 12, fontSize: 10, textAlign: 'right' },
      { id: 'divider4', type: 'divider', x: 30, y: 468, width: 50, height: 3, lineStyle: 'solid' },
      { id: 'total_label', type: 'text', content: 'TOTAL:', x: 30, y: 478, width: 20, height: 15, fontSize: 12, fontWeight: 'bold' },
      { id: 'total_val', type: 'text', content: '{{invoice.total}}', x: 50, y: 478, width: 30, height: 15, fontSize: 14, fontWeight: 'bold', textAlign: 'right' },
      { id: 'payment_info', type: 'text', content: 'Paid: {{payment.amount}} ({{payment.method}})', x: 0, y: 498, width: 80, height: 10, fontSize: 9 },
      { id: 'divider5', type: 'divider', x: 0, y: 515, width: 80, height: 3, lineStyle: 'dashed' },
      { id: 'footer', type: 'text', content: 'Thank you for shopping with us!', x: 0, y: 525, width: 80, height: 12, fontSize: 10, textAlign: 'center' },
      { id: 'footer2', type: 'text', content: 'Please keep this receipt for returns', x: 0, y: 537, width: 80, height: 10, fontSize: 8, textAlign: 'center' }
    ],
    isBuiltIn: true,
    isDefault: false
  },
  {
    name: 'Professional A4 Invoice',
    description: 'Professional A4 invoice for business transactions',
    category: 'invoice' as const,
    pageSize: 'A4' as const,
    orientation: 'portrait' as const,
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
    elements: [
      { id: 'header_bg', type: 'shape', shapeType: 'rectangle', x: 0, y: 0, width: 210, height: 45, backgroundColor: '#1e3a5f' },
      { id: 'logo', type: 'image', src: '{{business.logo}}', x: 20, y: 10, width: 40, height: 25 },
      { id: 'company_name', type: 'text', content: '{{business.name}}', x: 70, y: 12, width: 80, height: 12, fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
      { id: 'company_info', type: 'text', content: '{{business.address}}\n{{business.phone}}\n{{business.email}}', x: 70, y: 26, width: 80, height: 15, fontSize: 8, color: '#e0e0e0' },
      { id: 'invoice_title', type: 'text', content: 'INVOICE', x: 150, y: 10, width: 50, height: 15, fontSize: 20, fontWeight: 'bold', color: '#ffffff', textAlign: 'right' },
      { id: 'invoice_num', type: 'text', content: '#{{invoice.number}}', x: 150, y: 25, width: 50, height: 10, fontSize: 10, color: '#e0e0e0', textAlign: 'right' },
      { id: 'bill_to', type: 'text', content: 'BILL TO', x: 20, y: 60, width: 40, height: 8, fontSize: 8, fontWeight: 'bold', color: '#666666' },
      { id: 'customer_name', type: 'text', content: '{{customer.name}}', x: 20, y: 70, width: 80, height: 10, fontSize: 12, fontWeight: 'bold' },
      { id: 'customer_info', type: 'text', content: '{{customer.address}}\n{{customer.phone}}\n{{customer.email}}', x: 20, y: 82, width: 80, height: 20, fontSize: 9 },
      { id: 'invoice_details', type: 'text', content: 'Invoice Date: {{invoice.date}}\nDue Date: {{invoice.dueDate}}\nPayment Terms: {{invoice.paymentTerms}} days', x: 130, y: 60, width: 60, height: 25, fontSize: 9, textAlign: 'right' },
      { id: 'items_header_bg', type: 'shape', shapeType: 'rectangle', x: 20, y: 115, width: 170, height: 10, backgroundColor: '#f3f4f6' },
      { id: 'items_header', type: 'text', content: 'Item', x: 22, y: 117, width: 70, height: 8, fontSize: 9, fontWeight: 'bold' },
      { id: 'items_header_qty', type: 'text', content: 'Qty', x: 95, y: 117, width: 20, height: 8, fontSize: 9, fontWeight: 'bold', textAlign: 'center' },
      { id: 'items_header_price', type: 'text', content: 'Unit Price', x: 118, y: 117, width: 30, height: 8, fontSize: 9, fontWeight: 'bold', textAlign: 'right' },
      { id: 'items_header_total', type: 'text', content: 'Amount', x: 152, y: 117, width: 36, height: 8, fontSize: 9, fontWeight: 'bold', textAlign: 'right' },
      { id: 'items_table', type: 'table', source: 'items', x: 20, y: 128, width: 170, height: 180, columns: [
        { key: 'name', title: 'Description', width: 70 },
        { key: 'quantity', title: 'Qty', width: 20, align: 'center' as const },
        { key: 'price', title: 'Unit Price', width: 30, align: 'right' as const },
        { key: 'total', title: 'Amount', width: 36, align: 'right' as const }
      ]},
      { id: 'totals_bg', type: 'shape', shapeType: 'rectangle', x: 120, y: 315, width: 70, height: 50, backgroundColor: '#f9fafb' },
      { id: 'subtotal_label', type: 'text', content: 'Subtotal:', x: 125, y: 320, width: 30, height: 10, fontSize: 10, textAlign: 'right' },
      { id: 'subtotal_val', type: 'text', content: '{{invoice.subtotal}}', x: 155, y: 320, width: 32, height: 10, fontSize: 10, textAlign: 'right' },
      { id: 'tax_label', type: 'text', content: 'Tax ({{invoice.taxRate}}%):', x: 125, y: 332, width: 30, height: 10, fontSize: 10, textAlign: 'right' },
      { id: 'tax_val', type: 'text', content: '{{invoice.tax}}', x: 155, y: 332, width: 32, height: 10, fontSize: 10, textAlign: 'right' },
      { id: 'divider', type: 'divider', x: 125, y: 345, width: 60, height: 2 },
      { id: 'total_label', type: 'text', content: 'TOTAL DUE:', x: 125, y: 350, width: 30, height: 12, fontSize: 11, fontWeight: 'bold', textAlign: 'right' },
      { id: 'total_val', type: 'text', content: '{{invoice.total}}', x: 155, y: 350, width: 32, height: 12, fontSize: 12, fontWeight: 'bold', textAlign: 'right' },
      { id: 'footer', type: 'text', content: 'Payment is due within {{invoice.paymentTerms}} days. Thank you for your business!', x: 20, y: 260, width: 170, height: 12, fontSize: 9, textAlign: 'center', color: '#666666' },
      { id: 'signature', type: 'signature', x: 130, y: 275, width: 60, height: 25 },
      { id: 'signature_label', type: 'text', content: 'Authorized Signature', x: 130, y: 302, width: 60, height: 8, fontSize: 8, textAlign: 'center' }
    ],
    isBuiltIn: true,
    isDefault: false
  },
  {
    name: 'Delivery Note',
    description: 'Delivery note for goods dispatch',
    category: 'delivery' as const,
    pageSize: 'A4' as const,
    orientation: 'portrait' as const,
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
    elements: [
      { id: 'title', type: 'text', content: 'DELIVERY NOTE', x: 20, y: 20, width: 170, height: 20, fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
      { id: 'dn_num', type: 'text', content: 'DN-{{delivery.number}}', x: 20, y: 42, width: 170, height: 10, fontSize: 12, textAlign: 'center' },
      { id: 'company_info', type: 'text', content: '{{business.name}}\n{{business.address}}\n{{business.phone}}', x: 20, y: 60, width: 80, height: 30, fontSize: 9 },
      { id: 'delivery_to', type: 'text', content: 'DELIVER TO', x: 120, y: 60, width: 70, height: 8, fontSize: 8, fontWeight: 'bold', color: '#666666' },
      { id: 'recipient', type: 'text', content: '{{delivery.recipientName}}\n{{delivery.recipientAddress}}\n{{delivery.recipientPhone}}', x: 120, y: 70, width: 70, height: 25, fontSize: 9 },
      { id: 'date_info', type: 'text', content: 'Date: {{delivery.date}}\nOrder Ref: {{delivery.orderNumber}}', x: 120, y: 100, width: 70, height: 15, fontSize: 9, textAlign: 'right' },
      { id: 'items_header', type: 'text', content: 'Item', x: 22, y: 125, width: 80, height: 10, fontSize: 10, fontWeight: 'bold', backgroundColor: '#f3f4f6' },
      { id: 'items_header_qty', type: 'text', content: 'Quantity', x: 105, y: 125, width: 30, height: 10, fontSize: 10, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#f3f4f6' },
      { id: 'items_header_units', type: 'text', content: 'Units', x: 138, y: 125, width: 50, height: 10, fontSize: 10, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#f3f4f6' },
      { id: 'items_table', type: 'table', source: 'items', x: 20, y: 138, width: 170, height: 150, columns: [
        { key: 'name', title: 'Description', width: 80 },
        { key: 'quantity', title: 'Qty', width: 30, align: 'center' as const },
        { key: 'units', title: 'Units', width: 50, align: 'center' as const }
      ]},
      { id: 'notes_label', type: 'text', content: 'Notes:', x: 20, y: 220, width: 40, height: 10, fontSize: 9, fontWeight: 'bold' },
      { id: 'notes', type: 'text', content: '{{delivery.notes}}', x: 20, y: 232, width: 170, height: 30, fontSize: 9 },
      { id: 'received_by', type: 'signature', x: 20, y: 270, width: 70, height: 25 },
      { id: 'received_label', type: 'text', content: 'Received By', x: 20, y: 297, width: 70, height: 8, fontSize: 8, textAlign: 'center' },
      { id: 'delivered_by', type: 'signature', x: 120, y: 270, width: 70, height: 25 },
      { id: 'delivered_label', type: 'text', content: 'Delivered By', x: 120, y: 297, width: 70, height: 8, fontSize: 8, textAlign: 'center' }
    ],
    isBuiltIn: true,
    isDefault: false
  },
  {
    name: 'Purchase Order',
    description: 'Purchase order template for supplier orders',
    category: 'purchase' as const,
    pageSize: 'A4' as const,
    orientation: 'portrait' as const,
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
    elements: [
      { id: 'title', type: 'text', content: 'PURCHASE ORDER', x: 20, y: 20, width: 170, height: 20, fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
      { id: 'po_num', type: 'text', content: 'PO-{{purchase.number}}', x: 20, y: 42, width: 170, height: 10, fontSize: 12, textAlign: 'center' },
      { id: 'company_info', type: 'text', content: '{{business.name}}\n{{business.address}}\n{{business.phone}}', x: 20, y: 60, width: 80, height: 30, fontSize: 9 },
      { id: 'supplier_info', type: 'text', content: 'SUPPLIER\n{{supplier.name}}\n{{supplier.address}}\n{{supplier.phone}}', x: 120, y: 60, width: 70, height: 35, fontSize: 9 },
      { id: 'date_info', type: 'text', content: 'Date: {{purchase.date}}\nExpected Delivery: {{purchase.expectedDelivery}}', x: 120, y: 100, width: 70, height: 15, fontSize: 9, textAlign: 'right' },
      { id: 'items_header', type: 'text', content: 'Item', x: 22, y: 125, width: 70, height: 10, fontSize: 10, fontWeight: 'bold', backgroundColor: '#f3f4f6' },
      { id: 'items_header_qty', type: 'text', content: 'Qty', x: 95, y: 125, width: 20, height: 10, fontSize: 10, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#f3f4f6' },
      { id: 'items_header_cost', type: 'text', content: 'Unit Cost', x: 118, y: 125, width: 30, height: 10, fontSize: 10, fontWeight: 'bold', textAlign: 'right', backgroundColor: '#f3f4f6' },
      { id: 'items_header_total', type: 'text', content: 'Total', x: 152, y: 125, width: 38, height: 10, fontSize: 10, fontWeight: 'bold', textAlign: 'right', backgroundColor: '#f3f4f6' },
      { id: 'items_table', type: 'table', source: 'items', x: 20, y: 138, width: 170, height: 180, columns: [
        { key: 'name', title: 'Description', width: 70 },
        { key: 'quantity', title: 'Qty', width: 20, align: 'center' as const },
        { key: 'cost', title: 'Cost', width: 30, align: 'right' as const },
        { key: 'total', title: 'Total', width: 38, align: 'right' as const }
      ]},
      { id: 'totals', type: 'text', content: 'Subtotal: {{purchase.subtotal}}\nTax: {{purchase.tax}}\nTotal: {{purchase.total}}', x: 130, y: 325, width: 60, height: 25, fontSize: 10, textAlign: 'right' },
      { id: 'notes', type: 'text', content: 'Notes: {{purchase.notes}}', x: 20, y: 260, width: 170, height: 30, fontSize: 9 },
      { id: 'authorized', type: 'signature', x: 130, y: 280, width: 60, height: 25 },
      { id: 'authorized_label', type: 'text', content: 'Authorized By', x: 130, y: 307, width: 60, height: 8, fontSize: 8, textAlign: 'center' }
    ],
    isBuiltIn: true,
    isDefault: false
  },
  {
    name: 'Quotation',
    description: 'Professional quotation template',
    category: 'quotation' as const,
    pageSize: 'A4' as const,
    orientation: 'portrait' as const,
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
    elements: [
      { id: 'title', type: 'text', content: 'QUOTATION', x: 20, y: 20, width: 170, height: 20, fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
      { id: 'quote_num', type: 'text', content: 'QT-{{quotation.number}}', x: 20, y: 42, width: 170, height: 10, fontSize: 12, textAlign: 'center' },
      { id: 'quote_date', type: 'text', content: 'Date: {{quotation.date}}\nValid Until: {{quotation.validUntil}}', x: 20, y: 55, width: 80, height: 15, fontSize: 9 },
      { id: 'company_info', type: 'text', content: '{{business.name}}\n{{business.address}}\n{{business.phone}}\n{{business.email}}', x: 20, y: 75, width: 80, height: 35, fontSize: 9 },
      { id: 'customer_info', type: 'text', content: 'QUOTE TO\n{{customer.name}}\n{{customer.address}}\n{{customer.phone}}', x: 120, y: 75, width: 70, height: 35, fontSize: 9 },
      { id: 'items_header', type: 'text', content: 'Item', x: 22, y: 120, width: 70, height: 10, fontSize: 10, fontWeight: 'bold', backgroundColor: '#f3f4f6' },
      { id: 'items_header_qty', type: 'text', content: 'Qty', x: 95, y: 120, width: 20, height: 10, fontSize: 10, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#f3f4f6' },
      { id: 'items_header_price', type: 'text', content: 'Unit Price', x: 118, y: 120, width: 30, height: 10, fontSize: 10, fontWeight: 'bold', textAlign: 'right', backgroundColor: '#f3f4f6' },
      { id: 'items_header_total', type: 'text', content: 'Total', x: 152, y: 120, width: 38, height: 10, fontSize: 10, fontWeight: 'bold', textAlign: 'right', backgroundColor: '#f3f4f6' },
      { id: 'items_table', type: 'table', source: 'items', x: 20, y: 133, width: 170, height: 180, columns: [
        { key: 'name', title: 'Description', width: 70 },
        { key: 'quantity', title: 'Qty', width: 20, align: 'center' as const },
        { key: 'price', title: 'Price', width: 30, align: 'right' as const },
        { key: 'total', title: 'Total', width: 38, align: 'right' as const }
      ]},
      { id: 'totals', type: 'text', content: 'Subtotal: {{quotation.subtotal}}\nTax: {{quotation.tax}}\nTOTAL: {{quotation.total}}', x: 130, y: 320, width: 60, height: 25, fontSize: 10, textAlign: 'right' },
      { id: 'terms', type: 'text', content: 'Terms & Conditions:\n{{quotation.terms}}', x: 20, y: 260, width: 170, height: 40, fontSize: 8, color: '#666666' }
    ],
    isBuiltIn: true,
    isDefault: false
  }
];

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const pageSize = searchParams.get('pageSize');
    const isDefault = searchParams.get('isDefault');
    
    const query: any = {};
    
    if (category) query.category = category;
    if (pageSize) query.pageSize = pageSize;
    if (isDefault === 'true') query.isDefault = true;
    
    // Filter by branch for non-admin users
    if (user.role !== 'admin' && user.branch) {
      query.$or = [
        { branch: user.branch },
        { isBuiltIn: true }
      ];
    }
    
    const templates = await DocumentTemplate.find(query).sort({ isBuiltIn: -1, name: 1 });
    
    // If no templates exist, seed built-in templates
    if (templates.length === 0) {
      const builtInTemplates = BUILT_IN_TEMPLATES.map(t => ({
        ...t,
        createdBy: user.userId,
        branch: user.branch || undefined
      }));
      
      await DocumentTemplate.insertMany(builtInTemplates);
      const newTemplates = await DocumentTemplate.find(query).sort({ isBuiltIn: -1, name: 1 });
      
      return NextResponse.json({ success: true, templates: newTemplates, seeded: true });
    }
    
    return NextResponse.json({ success: true, templates });
  } catch (error) {
    console.error('Get templates error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!hasPermission(user.role as any, 'manage_settings')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    await dbConnect();
    
    const data = await request.json();
    
    // If setting as default, unset other defaults for this category
    if (data.isDefault) {
      await DocumentTemplate.updateMany(
        { category: data.category, branch: user.branch || data.branch },
        { isDefault: false }
      );
    }
    
    const template = await DocumentTemplate.create({
      ...data,
      createdBy: user.userId,
      branch: user.branch || data.branch
    });
    
    return NextResponse.json({ success: true, template }, { status: 201 });
  } catch (error) {
    console.error('Create template error:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
