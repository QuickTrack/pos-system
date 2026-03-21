import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import CustomerInvoice from '@/models/CustomerInvoice';
import CustomerPayment from '@/models/CustomerPayment';
import Customer from '@/models/Customer';
import Settings from '@/models/Settings';
import { getAuthUser } from '@/lib/auth-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const includeAgedReceivables = searchParams.get('includeAged') === 'true';

    // Get customer details
    const customer = await Customer.findById(id);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get business settings
    const settings = await Settings.findOne({}) || await Settings.create({});

    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate);
    }

    // Fetch invoices
    const invoiceQuery: any = { customer: id };
    if (startDate || endDate) {
      invoiceQuery.invoiceDate = dateFilter;
    }
    const invoices = await CustomerInvoice.find(invoiceQuery)
      .sort({ invoiceDate: 1 })
      .lean();

    // Fetch payments
    const paymentQuery: any = { customer: id };
    if (startDate || endDate) {
      paymentQuery.paymentDate = dateFilter;
    }
    const payments = await CustomerPayment.find(paymentQuery)
      .sort({ paymentDate: 1 })
      .lean();

    // Build statement transactions
    const transactions: Array<{
      type: 'invoice' | 'payment' | 'credit';
      date: Date;
      reference: string;
      description: string;
      debit: number;
      credit: number;
      balance: number;
      details?: any;
    }> = [];

    let runningBalance = 0;

    // Process invoices
    for (const invoice of invoices) {
      if (invoice.invoiceType === 'credit') {
        // Credit note - reduces balance
        runningBalance -= invoice.total;
        transactions.push({
          type: 'credit',
          date: invoice.invoiceDate,
          reference: invoice.invoiceNumber,
          description: `Credit Note - ${invoice.invoiceNumber}`,
          debit: 0,
          credit: invoice.total,
          balance: runningBalance,
          details: {
            items: invoice.items,
            subtotal: invoice.subtotal,
            tax: invoice.tax,
            total: invoice.total,
          },
        });
      } else {
        // Regular invoice - increases balance
        runningBalance += invoice.total;
        transactions.push({
          type: 'invoice',
          date: invoice.invoiceDate,
          reference: invoice.invoiceNumber,
          description: `Invoice - ${invoice.invoiceNumber}`,
          debit: invoice.total,
          credit: 0,
          balance: runningBalance,
          details: {
            items: invoice.items,
            subtotal: invoice.subtotal,
            tax: invoice.tax,
            total: invoice.total,
            dueDate: invoice.dueDate,
            paymentTerms: invoice.paymentTerms,
          },
        });
      }
    }

    // Process payments
    for (const payment of payments) {
      runningBalance -= payment.amount;
      transactions.push({
        type: 'payment',
        date: payment.paymentDate,
        reference: payment.paymentId,
        description: `Payment Received - ${payment.paymentMethod}`,
        debit: 0,
        credit: payment.amount,
        balance: runningBalance,
        details: {
          paymentMethod: payment.paymentMethod,
          referenceNumber: payment.referenceNumber,
          invoiceNumbers: payment.invoiceNumbers,
        },
      });
    }

    // Sort all transactions by date
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Recalculate running balance after sorting
    let recalculatedBalance = 0;
    for (let i = 0; i < transactions.length; i++) {
      recalculatedBalance += transactions[i].debit - transactions[i].credit;
      // Set the last transaction's balance to match actual customer balance
      if (i === transactions.length - 1) {
        transactions[i].balance = customer.creditBalance || 0;
      } else {
        transactions[i].balance = recalculatedBalance;
      }
    }

    // Calculate aged receivables (all outstanding invoices regardless of date filter)
    const agedReceivables = {
      current: 0,
      days30: 0,
      days60: 0,
      days90: 0,
      over90: 0,
      total: 0,
    };

    // Use actual customer creditBalance as the total
    agedReceivables.total = customer.creditBalance || 0;

    if (includeAgedReceivables || !startDate) {
      const outstandingInvoices = await CustomerInvoice.find({
        customer: id,
        status: { $in: ['sent', 'partial'] },
        balanceDue: { $gt: 0 },
      }).lean();

      const today = new Date();
      let calculatedTotal = 0;

      for (const invoice of outstandingInvoices) {
        const dueDate = new Date(invoice.dueDate);
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysOverdue <= 0) {
          agedReceivables.current += invoice.balanceDue;
        } else if (daysOverdue <= 30) {
          agedReceivables.days30 += invoice.balanceDue;
        } else if (daysOverdue <= 60) {
          agedReceivables.days60 += invoice.balanceDue;
        } else if (daysOverdue <= 90) {
          agedReceivables.days90 += invoice.balanceDue;
        } else {
          agedReceivables.over90 += invoice.balanceDue;
        }

        calculatedTotal += invoice.balanceDue;
      }

      // If calculated total matches customer balance, use breakdown; otherwise use customer balance as total
      if (Math.abs(calculatedTotal - (customer.creditBalance || 0)) < 1) {
        agedReceivables.total = calculatedTotal;
      }
    }

    // Calculate summary - use actual customer creditBalance as current balance
    const summary = {
      totalInvoices: invoices.filter(i => i.invoiceType !== 'credit').reduce((sum, i) => sum + i.total, 0),
      totalCredits: invoices.filter(i => i.invoiceType === 'credit').reduce((sum, i) => sum + i.total, 0),
      totalPayments: payments.reduce((sum, p) => sum + p.amount, 0),
      closingBalance: customer.creditBalance || 0, // Use actual customer balance from database
      invoiceCount: invoices.filter(i => i.invoiceType !== 'credit').length,
      creditCount: invoices.filter(i => i.invoiceType === 'credit').length,
      paymentCount: payments.length,
    };

    return NextResponse.json({
      success: true,
      statement: {
        customer: {
          _id: customer._id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          customerType: customer.customerType,
          creditLimit: customer.creditLimit,
          creditBalance: customer.creditBalance,
        },
        business: {
          businessName: settings.businessName,
          businessTagline: settings.businessTagline,
          phone: settings.phone,
          email: settings.email,
          address: settings.address,
          kraPin: settings.kraPin,
        },
        dateRange: {
          startDate: startDate || null,
          endDate: endDate || null,
          generatedAt: new Date(),
        },
        transactions,
        agedReceivables,
        summary,
      },
    });
  } catch (error) {
    console.error('Error fetching customer statement:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer statement' },
      { status: 500 }
    );
  }
}
