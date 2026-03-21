import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import CustomerInvoice from '@/models/CustomerInvoice';
import Customer from '@/models/Customer';
import { getAuthUser } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';

// Generate credit invoice number - sequential format
function generateCreditInvoiceNumber(sequence: number): string {
  const prefix = 'CINV';
  return `${prefix}-${String(sequence).padStart(4, '0')}`;
}

// Get the next credit invoice number
async function getNextCreditInvoiceNumber(): Promise<string> {
  const lastInvoice = await CustomerInvoice.findOne({
    invoiceNumber: { $regex: /^CINV-\d{4}$/ }
  }).sort({ invoiceNumber: -1 });
  
  let sequence = 1;
  if (lastInvoice?.invoiceNumber) {
    const parts = lastInvoice.invoiceNumber.split('-');
    if (parts.length === 2) {
      const num = parseInt(parts[1], 10);
      if (!isNaN(num)) {
        sequence = num + 1;
      }
    }
  }
  
  return generateCreditInvoiceNumber(sequence);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role as any, 'manage_sales')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const data = await request.json();

    // Validate customer
    const customer = await Customer.findById(data.customerId);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 400 });
    }

    const amount = data.amount;
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Get branch from user or data
    let branch = user.branch || data.branchId;
    const createdBy = user.userId;
    const createdByName = user.name;

    // If no branch, fetch default branch
    if (!branch) {
      const Branch = (await import('@/models/Branch')).default;
      const defaultBranch = await Branch.findOne();
      if (defaultBranch) {
        branch = defaultBranch._id.toString();
      }
    }

    // Create credit invoice
    const invoiceNumber = data.invoiceNumber || await getNextCreditInvoiceNumber();
    
    // Determine if this is a refund (decrease balance) or charge (increase balance)
    // If isRefund is true, decrease the balance (sales returns)
    // Otherwise, increase the balance (account charges)
    const isRefund = data.isRefund === true;
    
    const creditInvoice = await CustomerInvoice.create({
      invoiceNumber,
      invoiceType: 'credit',
      referenceInvoiceId: data.referenceInvoiceId,
      referenceInvoiceNumber: data.referenceInvoiceNumber,
      customer: customer._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: customer.address,
      customerKraPin: customer.kraPin,
      creditLimit: customer.creditLimit,
      paymentTerms: data.paymentTerms || 30,
      dueDate: data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: data.items || [],
      subtotal: amount,
      discount: 0,
      discountAmount: 0,
      tax: 0,
      taxRate: 0,
      total: amount,
      amountPaid: 0,
      balanceDue: amount,
      status: 'sent', // Credit invoices are treated as sent/open
      branch,
      createdBy,
      createdByName,
      notes: data.notes || `Credit invoice for customer account - ${data.description || 'Account charge'}`,
      payments: [],
      invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : new Date(),
    });

    // Update customer's credit balance
    // If isRefund (sales return), decrease balance - otherwise increase
    const balanceChange = isRefund ? -amount : amount;
    await Customer.findByIdAndUpdate(customer._id, {
      $inc: { creditBalance: balanceChange },
    });

    // Fetch updated customer to return new balance
    const updatedCustomer = await Customer.findById(customer._id);
    
    if (!updatedCustomer) {
      return NextResponse.json({
        success: true,
        creditInvoice,
        customer: {
          _id: customer._id,
          name: customer.name,
          creditBalance: customer.creditBalance,
          creditLimit: customer.creditLimit,
        },
      }, { status: 201 });
    }

    return NextResponse.json({
      success: true,
      creditInvoice,
      customer: {
        _id: updatedCustomer._id,
        name: updatedCustomer.name,
        creditBalance: updatedCustomer.creditBalance,
        creditLimit: updatedCustomer.creditLimit,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Create credit invoice error:', error);
    return NextResponse.json(
      { error: 'Failed to create credit invoice' },
      { status: 500 }
    );
  }
}
