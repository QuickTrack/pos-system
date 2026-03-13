import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Purchase from '@/models/Purchase';
import Product from '@/models/Product';
import '@/models';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    
    const purchase = await Purchase.findById(id);
    
    if (!purchase) {
      return NextResponse.json(
        { error: 'Purchase not found' },
        { status: 404 }
      );
    }
    
    // Update items if provided (with edited quantities/costs)
    let updatedItems = purchase.items;
    let subtotal = purchase.subtotal;
    
    if (body.items && Array.isArray(body.items)) {
      updatedItems = body.items.map((item: any) => ({
        product: item.product,
        productName: item.productName,
        sku: item.sku || '',
        quantity: item.quantity,
        unitCost: item.unitCost,
        total: item.quantity * item.unitCost,
        receivedQuantity: item.quantity,
      }));
      
      subtotal = updatedItems.reduce((sum: number, item: any) => sum + item.total, 0);
    } else {
      // Default: mark all items as fully received
      updatedItems = purchase.items.map((item: any) => ({
        ...item.toObject(),
        receivedQuantity: item.quantity,
      }));
    }
    
    // Recalculate totals
    const discountAmount = purchase.discount || 0;
    const taxableAmount = subtotal - discountAmount;
    const tax = taxableAmount * 0.16;
    const total = taxableAmount + tax;
    const balance = total - purchase.amountPaid;
    
    // Update purchase
    purchase.items = updatedItems;
    purchase.subtotal = subtotal;
    purchase.tax = tax;
    purchase.total = total;
    purchase.balance = balance;
    purchase.status = 'received';
    purchase.paymentStatus = balance === 0 ? 'paid' : purchase.paymentStatus;
    
    await purchase.save();
    
    // Update product stock for each received item
    for (const item of updatedItems) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stockQuantity: item.receivedQuantity } },
        { new: true }
      );
    }
    
    return NextResponse.json({
      success: true,
      purchase,
    });
  } catch (error) {
    console.error('Receive order error:', error);
    return NextResponse.json(
      { error: 'Failed to receive order' },
      { status: 500 }
    );
  }
}