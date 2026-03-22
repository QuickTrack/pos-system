import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Sale from '@/models/Sale';
import Product from '@/models/Product';
import { getAuthUser } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    // Accept both saleId and originalSaleId for compatibility
    const saleId = body.saleId || body.originalSaleId;
    const items = body.items;
    const reason = body.reason;
    const refundMethod = body.refundMethod;
    const customerId = body.customerId;

    if (!saleId) {
      return NextResponse.json(
        { error: 'Sale ID is required' },
        { status: 400 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Items are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find the original sale
    const originalSale = await Sale.findById(saleId);
    if (!originalSale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }
    
    // Check if sale is already refunded
    if (originalSale.status === 'refunded') {
      return NextResponse.json(
        { error: 'This sale has already been refunded' },
        { status: 400 }
      );
    }

    // Process return items and restore inventory
    const returnItems = [];
    let totalReturnAmount = 0;

    for (const item of items) {
      // Accept both productId and product fields
      const productId = item.productId || item.product;
      const quantity = item.quantity;
      const unitPrice = item.unitPrice;
      
      if (!productId) {
        return NextResponse.json(
          { error: 'Product ID is missing in items' },
          { status: 400 }
        );
      }

      // Find product and restore quantity
      const product = await Product.findById(productId);
      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${productId}` },
          { status: 404 }
        );
      }

      // Calculate return amount for this item
      const itemTotal = quantity * unitPrice;
      totalReturnAmount += itemTotal;

      // Find the unit in the original sale to get conversion info
      const saleItem = originalSale.items.find(
        (si: any) => si.product?.toString() === productId
      );

      if (saleItem) {
        // Restore inventory based on the unit used in original sale
        const conversionToBase = saleItem.conversionToBase || 1;
        const baseQuantityToRestore = quantity * conversionToBase;
        
        // Restore to main stock quantity
        product.stockQuantity = (product.stockQuantity || 0) + baseQuantityToRestore;
        await product.save();
      }

      returnItems.push({
        productId,
        productName: product.name,
        sku: product.sku,
        quantity,
        unitPrice,
        unitName: item.unitName || saleItem?.unitName || product.baseUnit,
        total: itemTotal
      });
    }

    // Create a unique invoice number for the refund
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const refundInvoiceNumber = `REF-${originalSale.invoiceNumber}-${timestamp}-${randomSuffix}`;

    // Create a refund sale record
    const refundSale = new Sale({
      invoiceNumber: refundInvoiceNumber,
      branch: (originalSale as any).branch,
      cashier: user.userId,
      cashierName: user.name || user.email || 'System',
      items: returnItems.map((item: any) => ({
        product: item.productId,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: 0,
        tax: 0,
        total: item.total,
        unitName: item.unitName,
        conversionToBase: 1
      })),
      subtotal: -totalReturnAmount,
      discount: 0,
      discountAmount: 0,
      tax: 0,
      taxRate: 0,
      total: -totalReturnAmount,
      paymentMethod: refundMethod || 'cash',
      amountPaid: 0,
      change: 0,
      status: 'refunded',
      isRefund: true,
      refundedSale: saleId,
      refundReason: reason || '',
      saleDate: new Date(),
      customer: customerId || originalSale.customer,
      customerName: originalSale.customerName,
      customerPhone: originalSale.customerPhone
    });

    await refundSale.save();
    
    // Update the original sale status to refunded
    await Sale.findByIdAndUpdate(saleId, {
      status: 'refunded',
      isRefund: true,
      refundedSale: refundSale._id
    });

    return NextResponse.json({
      success: true,
      message: 'Return processed successfully',
      returnDetails: {
        saleId,
        originalInvoiceNumber: originalSale.invoiceNumber,
        refundInvoiceNumber: refundSale.invoiceNumber,
        items: returnItems,
        totalAmount: totalReturnAmount,
        reason,
        refundMethod,
        processedAt: new Date(),
        processedBy: user.name || user.email
      }
    });
  } catch (error) {
    console.error('Process return error:', error);
    return NextResponse.json(
      { error: 'Failed to process return' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const saleId = searchParams.get('saleId');

    await dbConnect();

    if (saleId) {
      // Get refund sales for a specific original sale
      const refunds = await Sale.find({ 
        refundedSale: saleId,
        isRefund: true 
      });

      return NextResponse.json({
        success: true,
        refunds
      });
    }

    // Return all refund sales
    const refunds = await Sale.find({ isRefund: true })
      .sort({ saleDate: -1 })
      .limit(100);

    return NextResponse.json({
      success: true,
      refunds
    });
  } catch (error) {
    console.error('Get returns error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch returns' },
      { status: 500 }
    );
  }
}
