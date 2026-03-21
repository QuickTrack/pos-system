import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import CustomerInvoice from '@/models/CustomerInvoice';
import Customer from '@/models/Customer';
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

    // Get customer details
    const customer = await Customer.findById(id);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get all outstanding invoices for this customer
    const outstandingInvoices = await CustomerInvoice.find({
      customer: id,
      status: { $in: ['sent', 'partial'] },
    }).sort({ dueDate: 1 });

    // Calculate totals
    const totalOutstanding = outstandingInvoices.reduce(
      (sum, inv) => sum + inv.balanceDue,
      0
    );

    const overdueInvoices = outstandingInvoices.filter(
      (inv) => new Date(inv.dueDate) < new Date()
    );

    const totalOverdue = overdueInvoices.reduce(
      (sum, inv) => sum + inv.balanceDue,
      0
    );

    // Get credit limit info
    const creditLimit = customer.creditLimit || 0;
    const availableCredit = Math.max(0, creditLimit - totalOutstanding);

    // Format invoice details
    const invoices = outstandingInvoices.map((inv) => ({
      _id: inv._id,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      dueDate: inv.dueDate,
      total: inv.total,
      amountPaid: inv.amountPaid,
      balanceDue: inv.balanceDue,
      status: inv.status,
      isOverdue: new Date(inv.dueDate) < new Date(),
    }));

    return NextResponse.json({
      success: true,
      customer: {
        _id: customer._id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        creditBalance: customer.creditBalance,
        creditLimit: creditLimit,
        customerType: customer.customerType,
      },
      debtSummary: {
        totalOutstanding,
        totalOverdue,
        availableCredit,
        invoiceCount: outstandingInvoices.length,
        overdueCount: overdueInvoices.length,
        isOverdue: totalOverdue > 0,
      },
      invoices,
    });
  } catch (error) {
    console.error('Error fetching customer debt:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer debt information' },
      { status: 500 }
    );
  }
}
