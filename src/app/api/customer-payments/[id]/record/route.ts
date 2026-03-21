import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import CustomerPayment from '@/models/CustomerPayment';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const payment = await CustomerPayment.findById(id);

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    if (payment.status === 'paid') {
      return NextResponse.json(
        { success: false, error: 'Payment already recorded' },
        { status: 400 }
      );
    }

    // Update payment status to paid
    payment.status = 'paid';
    await payment.save();

    // Update customer creditBalance (decrease by payment amount)
    if (payment.customer && payment.customer._id) {
      const Customer = (await import('@/models/Customer')).default;
      await Customer.findByIdAndUpdate(payment.customer._id, {
        $inc: { creditBalance: -payment.amount }
      });
    }

    // Update the linked sales invoices
    if (payment.invoiceNumbers && payment.invoiceNumbers.length > 0) {
      const Sale = (await import('@/models/Sale')).default;
      
      for (const invoiceNumber of payment.invoiceNumbers) {
        const sale = await Sale.findOne({ invoiceNumber });
        if (sale) {
          const newAmountPaid = sale.amountPaid + payment.amount;
          const newStatus = newAmountPaid >= sale.total ? 'paid' : 'partial';
          
          await Sale.findByIdAndUpdate(sale._id, {
            amountPaid: newAmountPaid,
            paymentStatus: newStatus,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      payment: {
        ...payment.toObject(),
        _id: payment._id.toString(),
      },
    });
  } catch (error) {
    console.error('Error recording customer payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record customer payment' },
      { status: 500 }
    );
  }
}