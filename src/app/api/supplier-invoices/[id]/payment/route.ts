import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import SupplierInvoice from '@/models/SupplierInvoice';
import Supplier from '@/models/Supplier';
import { getAuthUser } from '@/lib/auth-server';
import '@/models';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await dbConnect();
    
    const data = await request.json();
    
    const invoice = await SupplierInvoice.findById(id);
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }
    
    // Validate payment amount
    if (data.amount <= 0) {
      return NextResponse.json(
        { error: 'Payment amount must be greater than 0' },
        { status: 400 }
      );
    }
    
    if (data.amount > invoice.balance) {
      return NextResponse.json(
        { error: 'Payment amount exceeds balance' },
        { status: 400 }
      );
    }
    
    // Add payment to invoice
    const payment = {
      amount: data.amount,
      paymentDate: data.paymentDate || new Date(),
      paymentMethod: data.paymentMethod,
      referenceNumber: data.referenceNumber,
      notes: data.notes,
      recordedBy: data.recordedBy,
      recordedByName: data.recordedByName,
    };
    
    invoice.payments.push(payment);
    invoice.amountPaid += data.amount;
    invoice.balance = invoice.total - invoice.amountPaid;
    
    // Update status based on payment
    if (invoice.balance === 0) {
      invoice.status = 'paid';
    } else if (invoice.amountPaid > 0) {
      invoice.status = 'partially_paid';
    }
    
    await invoice.save();
    
    // Update supplier's balance (reduce the amount owed)
    if (invoice.supplier) {
      await Supplier.findByIdAndUpdate(invoice.supplier, {
        $inc: { balance: -data.amount },
      });
    }
    
    return NextResponse.json({
      success: true,
      invoice,
    });
  } catch (error) {
    console.error('Record payment error:', error);
    return NextResponse.json(
      { error: 'Failed to record payment' },
      { status: 500 }
    );
  }
}
