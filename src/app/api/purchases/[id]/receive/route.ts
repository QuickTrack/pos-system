import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Purchase from '@/models/Purchase';
import Product from '@/models/Product';
import { StockAudit, User } from '@/models';
import { getAuthUser } from '@/lib/auth-server';
import '@/models';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    
    // Get location from request body, default to 'shop'
    const location = body.location || 'shop';
    
    // Validate location
    if (!['shop', 'remote'].includes(location)) {
      return NextResponse.json(
        { error: 'Invalid location. Must be "shop" or "remote"' },
        { status: 400 }
      );
    }
    
    // Get current user for audit
    const authUser = await getAuthUser();
    let userName = 'System';
    if (authUser) {
      const user = await User.findById(authUser.userId);
      if (user) {
        userName = user.name;
      }
    }
    
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
    
    // Update product stock for each received item - at specified location
    for (const item of updatedItems) {
      const product = await Product.findById(item.product);
      if (product) {
        // Get quantity before
        const quantityBefore = location === 'shop' ? product.shopStock : product.remoteStock;
        
        // Update stock at the specified location
        const updateField = location === 'shop' ? 'shopStock' : 'remoteStock';
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { [updateField]: item.receivedQuantity, stockQuantity: item.receivedQuantity } },
          { new: true }
        );
        
        // Get quantity after
        const quantityAfter = quantityBefore + item.receivedQuantity;
        
        // Create audit log for the purchase receipt
        await StockAudit.create({
          product: product._id,
          productName: product.name,
          productSku: product.sku,
          movementType: 'purchase',
          quantity: item.receivedQuantity,
          quantityBefore,
          quantityAfter,
          location,
          referenceType: 'purchase',
          referenceId: purchase._id,
          referenceNumber: purchase.orderNumber,
          supplier: purchase.supplier,
          supplierName: purchase.supplierName,
          supplierInvoiceNumber: purchase.orderNumber,
          userName,
          notes: `Received from purchase ${purchase.orderNumber} at ${location}`,
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      purchase,
      location,
    });
  } catch (error) {
    console.error('Receive order error:', error);
    return NextResponse.json(
      { error: 'Failed to receive order' },
      { status: 500 }
    );
  }
}
