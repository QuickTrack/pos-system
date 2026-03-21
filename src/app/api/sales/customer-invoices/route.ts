import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Sale from '@/models/Sale';
import CustomerInvoice from '@/models/CustomerInvoice';

export async function GET(request: Request) {
  try {
    await connectDB();

    // Get customer invoices (backoffice invoices)
    const customerInvoices = await CustomerInvoice.find({
      status: { $in: ['draft', 'sent', 'partial'] },
      balanceDue: { $gt: 0 },
    })
      .select('customer customerName customerPhone invoiceNumber total amountPaid balanceDue dueDate status invoiceDate invoiceType')
      .sort({ dueDate: 1 })
      .lean();

    // Get credit sales from POS (sales with account/credit payment method)
    const creditSales = await Sale.find({
      paymentMethod: 'account',
      status: 'completed',
      customer: { $exists: true, $ne: null },
    })
      .select('invoiceNumber customer customerName customerPhone total amountPaid saleDate')
      .sort({ saleDate: -1 })
      .lean();

    // Create a map to track unique invoices by invoice number
    const invoiceMap = new Map<string, {
      invoiceNumber: string;
      total: number;
      amountPaid: number;
      balance: number;
      paymentStatus: string;
      saleDate: Date;
      source: 'pos' | 'backoffice';
    }>();

    // Process CustomerInvoices (backoffice)
    for (const invoice of customerInvoices) {
      const invoiceNumber = invoice.invoiceNumber;
      const balance = invoice.balanceDue || 0;

      if (balance <= 0) continue;

      // Use invoice number as key to avoid duplicates
      if (!invoiceMap.has(invoiceNumber)) {
        invoiceMap.set(invoiceNumber, {
          invoiceNumber,
          total: invoice.total || 0,
          amountPaid: invoice.amountPaid || 0,
          balance,
          paymentStatus: invoice.status || 'unpaid',
          saleDate: invoice.invoiceDate || invoice.dueDate,
          source: 'backoffice',
        });
      }
    }

    // Process credit sales (POS) - only add if not already in map
    for (const sale of creditSales) {
      const invoiceNumber = sale.invoiceNumber;
      const total = sale.total || 0;
      const amountPaid = sale.amountPaid || 0;
      const balance = total - amountPaid;

      // Skip if already in map (avoid duplicates) or if no customer
      if (balance <= 0 || !invoiceNumber) continue;

      // Only add if not already present (prefer backoffice invoice if exists)
      if (!invoiceMap.has(invoiceNumber)) {
        invoiceMap.set(invoiceNumber, {
          invoiceNumber,
          total,
          amountPaid,
          balance,
          paymentStatus: amountPaid >= total ? 'paid' : (amountPaid > 0 ? 'partial' : 'unpaid'),
          saleDate: sale.saleDate,
          source: 'pos',
        });
      }
    }

    // Group by customer
    const customerMap = new Map();

    // Add all invoices to customer map
    for (const [invoiceNumber, invoiceData] of invoiceMap) {
      // We need to find the customer for this invoice
      // First check CustomerInvoices
      const backofficeInvoice = customerInvoices.find(inv => inv.invoiceNumber === invoiceNumber);
      
      let customerId: string;
      let customerName: string;
      let customerPhone = '';

      if (backofficeInvoice) {
        customerId = backofficeInvoice.customer ? backofficeInvoice.customer.toString() : 'unknown';
        customerName = backofficeInvoice.customerName || 'Unknown Customer';
        customerPhone = backofficeInvoice.customerPhone || '';
      } else {
        // Check credit sales
        const posSale = creditSales.find(s => s.invoiceNumber === invoiceNumber);
        customerId = posSale?.customer ? posSale.customer.toString() : 'unknown';
        customerName = posSale?.customerName || 'Unknown Customer';
        customerPhone = posSale?.customerPhone || '';
      }

      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          customerId,
          customerName,
          customerPhone,
          invoices: [],
          totalOutstanding: 0,
        });
      }

      const customerData = customerMap.get(customerId);
      customerData.invoices.push(invoiceData);
      customerData.totalOutstanding += invoiceData.balance;
    }

    // Convert map to array
    const result = Array.from(customerMap.values()).map(customer => ({
      ...customer,
      totalOutstanding: Math.round(customer.totalOutstanding * 100) / 100,
    }));

    // Sort by total outstanding (highest first)
    result.sort((a, b) => b.totalOutstanding - a.totalOutstanding);

    return NextResponse.json({
      success: true,
      customerInvoices: result,
    });
  } catch (error) {
    console.error('Error fetching customer invoices:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customer invoices' },
      { status: 500 }
    );
  }
}