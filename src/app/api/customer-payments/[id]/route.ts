import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import CustomerPayment from '@/models/CustomerPayment';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    
    const payment = await CustomerPayment.findById(id)
      .populate('customer', 'name phone email')
      .populate('recordedBy', 'name');

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      payment: {
        ...payment.toObject(),
        _id: payment._id.toString(),
      },
    });
  } catch (error) {
    console.error('Error fetching customer payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customer payment' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { amount, paymentDate, paymentMethod, referenceNumber, invoiceNumbers, notes, status } = body;

    const payment = await CustomerPayment.findByIdAndUpdate(
      id,
      {
        ...(amount && { amount }),
        ...(paymentDate && { paymentDate }),
        ...(paymentMethod && { paymentMethod }),
        ...(referenceNumber && { referenceNumber }),
        ...(invoiceNumbers && { invoiceNumbers }),
        ...(notes && { notes }),
        ...(status && { status }),
      },
      { new: true }
    );

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      payment: {
        ...payment.toObject(),
        _id: payment._id.toString(),
      },
    });
  } catch (error) {
    console.error('Error updating customer payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update customer payment' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const payment = await CustomerPayment.findByIdAndDelete(id);

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    // If payment had linked invoices, update their status
    if (payment.invoiceNumbers && payment.invoiceNumbers.length > 0) {
      const Sale = (await import('@/models/Sale')).default;
      
      for (const invoiceNumber of payment.invoiceNumbers) {
        const sale = await Sale.findOne({ invoiceNumber });
        if (sale) {
          // Reverse the payment by subtracting
          const newAmountPaid = Math.max(0, sale.amountPaid - payment.amount);
          const newStatus = newAmountPaid >= sale.total ? 'paid' : (newAmountPaid > 0 ? 'partial' : 'unpaid');
          
          await Sale.findByIdAndUpdate(sale._id, {
            amountPaid: newAmountPaid,
            paymentStatus: newStatus,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Payment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting customer payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete customer payment' },
      { status: 500 }
    );
  }
}