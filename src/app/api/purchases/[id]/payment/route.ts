import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Purchase from '@/models/Purchase';
import '@/models';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    const { id } = await params;
    const body = await request.json();
    const { amount } = body;
    
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid payment amount' },
        { status: 400 }
      );
    }
    
    const purchase = await Purchase.findById(id);
    
    if (!purchase) {
      return NextResponse.json(
        { error: 'Purchase not found' },
        { status: 404 }
      );
    }
    
    // Update amountPaid and recalculate balance
    purchase.amountPaid = (purchase.amountPaid || 0) + amount;
    purchase.balance = purchase.total - purchase.amountPaid;
    
    // Update payment status
    if (purchase.balance <= 0) {
      purchase.paymentStatus = 'paid';
    } else if (purchase.amountPaid > 0) {
      purchase.paymentStatus = 'partial';
    }
    
    await purchase.save();
    
    return NextResponse.json({
      success: true,
      purchase,
    });
  } catch (error) {
    console.error('Record payment error:', error);
    return NextResponse.json(
      { error: 'Failed to record payment' },
      { status: 500 }
    );
  }
}