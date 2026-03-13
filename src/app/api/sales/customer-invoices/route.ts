import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Sale from '@/models/Sale';

export async function GET(request: Request) {
  try {
    await connectDB();

    // Find all sales with credit payment method or outstanding balance
    // Also look for sales with paymentStatus field (for tracked payments)
    const sales = await Sale.find({
      $or: [
        { paymentMethod: 'credit' },
        { paymentStatus: { $in: ['partial', 'unpaid'] } },
      ],
      status: { $ne: 'voided' },
    })
      .select('invoiceNumber customer customerName customerPhone total amountPaid paymentStatus saleDate')
      .sort({ saleDate: -1 })
      .lean();

    // Group by customer
    const customerMap = new Map();

    for (const sale of sales) {
      const customerId = sale.customer ? sale.customer.toString() : 'unknown';
      const customerName = sale.customerName || 'Unknown Customer';
      
      const total = sale.total || 0;
      const amountPaid = sale.amountPaid || 0;
      const balance = total - amountPaid;
      
      // Only include invoices with outstanding balance
      if (balance <= 0) continue;

      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          customerId,
          customerName: sale.customerName || 'Unknown Customer',
          customerPhone: sale.customerPhone,
          invoices: [],
          totalOutstanding: 0,
        });
      }

      const customerData = customerMap.get(customerId);
      customerData.invoices.push({
        invoiceNumber: sale.invoiceNumber,
        total,
        amountPaid,
        balance,
        paymentStatus: (sale as any).paymentStatus || (amountPaid >= total ? 'paid' : (amountPaid > 0 ? 'partial' : 'unpaid')),
        saleDate: sale.saleDate,
      });
      customerData.totalOutstanding += balance;
    }

    // Convert map to array
    const customerInvoices = Array.from(customerMap.values()).map(customer => ({
      ...customer,
      totalOutstanding: Math.round(customer.totalOutstanding * 100) / 100,
    }));

    // Sort by total outstanding (highest first)
    customerInvoices.sort((a, b) => b.totalOutstanding - a.totalOutstanding);

    return NextResponse.json({
      success: true,
      customerInvoices,
    });
  } catch (error) {
    console.error('Error fetching customer invoices:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customer invoices' },
      { status: 500 }
    );
  }
}