import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import SupplierPayment from '@/models/SupplierPayment';
import Purchase from '@/models/Purchase';
import '@/models';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    
    const payment = await SupplierPayment.findById(id);
    
    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }
    
    // Update payment status to recorded/paid
    payment.status = 'paid';
    payment.recordedAt = new Date();
    if (body.recordedBy) {
      payment.recordedBy = body.recordedBy;
    }
    
    await payment.save();
    
    // Update related purchase invoices if any
    if (payment.invoiceNumbers && payment.invoiceNumbers.length > 0) {
      for (const orderNumber of payment.invoiceNumbers) {
        await Purchase.findOneAndUpdate(
          { orderNumber },
          { 
            $inc: { amountPaid: payment.amount },
          }
        );
        
        // Recalculate balance and status
        const purchase = await Purchase.findOne({ orderNumber });
        if (purchase) {
          purchase.balance = purchase.total - purchase.amountPaid;
          if (purchase.balance <= 0) {
            purchase.paymentStatus = 'paid';
            purchase.balance = 0;
          } else if (purchase.amountPaid > 0) {
            purchase.paymentStatus = 'partial';
          }
          await purchase.save();
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error('Record payment error:', error);
    return NextResponse.json(
      { error: 'Failed to record payment' },
      { status: 500 }
    );
  }
}