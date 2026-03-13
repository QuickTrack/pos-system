import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import SupplierPayment from '@/models/SupplierPayment';
import Purchase from '@/models/Purchase';
import '@/models';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    const { id } = await params;
    
    const payment = await SupplierPayment.findById(id)
      .populate('supplier', 'name phone email');
    
    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error('Get supplier payment error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    const { id } = await params;
    const data = await request.json();
    
    const payment = await SupplierPayment.findById(id);
    
    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }
    
    // Update payment fields
    if (data.amount) payment.amount = data.amount;
    if (data.paymentDate) payment.paymentDate = new Date(data.paymentDate);
    if (data.paymentMethod) payment.paymentMethod = data.paymentMethod;
    if (data.invoiceNumbers) payment.invoiceNumbers = data.invoiceNumbers;
    if (data.status) payment.status = data.status;
    if (data.notes !== undefined) payment.notes = data.notes;
    
    await payment.save();
    
    return NextResponse.json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error('Update supplier payment error:', error);
    return NextResponse.json(
      { error: 'Failed to update payment' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    const { id } = await params;
    
    const payment = await SupplierPayment.findById(id);
    
    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }
    
    // Reverse any purchase updates if invoices were linked
    if (payment.invoiceNumbers && payment.invoiceNumbers.length > 0) {
      for (const orderNumber of payment.invoiceNumbers) {
        await Purchase.findOneAndUpdate(
          { orderNumber },
          { 
            $inc: { amountPaid: -payment.amount },
          }
        );
        // Recalculate balance
        const purchase = await Purchase.findOne({ orderNumber });
        if (purchase) {
          purchase.balance = purchase.total - purchase.amountPaid;
          purchase.paymentStatus = purchase.balance <= 0 ? 'paid' : 
            purchase.amountPaid > 0 ? 'partial' : 'unpaid';
          await purchase.save();
        }
      }
    }
    
    await payment.deleteOne();
    
    return NextResponse.json({
      success: true,
      message: 'Payment deleted successfully',
    });
  } catch (error) {
    console.error('Delete supplier payment error:', error);
    return NextResponse.json(
      { error: 'Failed to delete payment' },
      { status: 500 }
    );
  }
}