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

    // Update customer creditBalance only if payment method is 'credit'
    // (customer used their store credit to pay)
    if (payment.customer && payment.customer._id && payment.paymentMethod === 'credit') {
      const Customer = (await import('@/models/Customer')).default;
      await Customer.findByIdAndUpdate(payment.customer._id, {
        $inc: { creditBalance: -payment.amount }
      });
    }

    // Update the linked sales and customer invoices
    if (payment.invoiceNumbers && payment.invoiceNumbers.length > 0) {
      const Sale = (await import('@/models/Sale')).default;
      const CustomerInvoice = (await import('@/models/CustomerInvoice')).default;
      const mongooseModule = await import('mongoose');
      const mongoose = mongooseModule.default;
      
      for (const invoiceNumber of payment.invoiceNumbers) {
        // Update Sale invoices
        const sale = await Sale.findOne({ invoiceNumber });
        if (sale) {
          const newAmountPaid = sale.amountPaid + payment.amount;
          const newStatus = newAmountPaid >= sale.total ? 'paid' : 'partial';
          
          await Sale.findByIdAndUpdate(sale._id, {
            amountPaid: newAmountPaid,
            paymentStatus: newStatus,
          });
        }
        
        // Update CustomerInvoice records
        const customerInvoice = await CustomerInvoice.findOne({ invoiceNumber });
        if (customerInvoice) {
          const newAmountPaid = customerInvoice.amountPaid + payment.amount;
          const newBalanceDue = Math.max(0, customerInvoice.total - newAmountPaid);
          
          let newStatus: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled' = customerInvoice.status;
          if (newBalanceDue <= 0 && newAmountPaid >= customerInvoice.total) {
            newStatus = 'paid';
          } else if (newAmountPaid > 0) {
            newStatus = 'partial';
          }
          
          // Add payment record to invoice and update amounts/status
          await CustomerInvoice.findByIdAndUpdate(customerInvoice._id, {
            $push: {
              payments: {
                amount: payment.amount,
                date: payment.paymentDate,
                method: payment.paymentMethod as 'cash' | 'mpesa' | 'bank' | 'cheque' | 'other',
                reference: payment.referenceNumber,
                notes: payment.notes,
                recordedBy: new mongoose.Types.ObjectId(payment.recordedBy || payment.customer),
              },
            },
            $set: {
              amountPaid: newAmountPaid,
              balanceDue: newBalanceDue,
              status: newStatus,
            },
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