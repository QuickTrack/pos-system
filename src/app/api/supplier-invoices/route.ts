import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/mongodb';
import SupplierInvoice from '@/models/SupplierInvoice';
import Supplier from '@/models/Supplier';
import Purchase from '@/models/Purchase';
import Product from '@/models/Product';
import { getAuthUser } from '@/lib/auth-server';
import '@/models';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const supplier = searchParams.get('supplier');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const query: any = {};
    
    if (status) {
      // Handle comma-separated status values
      if (status.includes(',')) {
        query.status = { $in: status.split(',').map(s => s.trim()) };
      } else {
        query.status = status;
      }
    }
    if (supplier) query.supplier = supplier;
    
    if (startDate && endDate) {
      query.invoiceDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    
    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { supplierName: { $regex: search, $options: 'i' } },
        { purchaseOrderNumber: { $regex: search, $options: 'i' } },
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const [invoices, total] = await Promise.all([
      SupplierInvoice.find(query)
        .populate('supplier', 'name phone email')
        .populate('items.product', 'name sku')
        .sort({ invoiceDate: -1 })
        .skip(skip)
        .limit(limit),
      SupplierInvoice.countDocuments(query),
    ]);
    
    return NextResponse.json({
      success: true,
      invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get supplier invoices error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supplier invoices' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await dbConnect();
    
    const data = await request.json();
    
    console.log('Creating supplier invoice with data:', JSON.stringify(data, null, 2));
    
    // Validate required fields
    if (!data.supplierId) {
      return NextResponse.json({ error: 'Supplier is required' }, { status: 400 });
    }
    if (!data.items || data.items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }
    
    // Use invoice number from form if provided, otherwise generate one
    let invoiceNumber = data.invoiceNumber;
    if (!invoiceNumber || invoiceNumber.trim() === '') {
      const lastInvoice = await SupplierInvoice.findOne().sort({ createdAt: -1 });
      invoiceNumber = '00001';
      if (lastInvoice?.invoiceNumber) {
        const num = parseInt(lastInvoice.invoiceNumber) || 0;
        invoiceNumber = String(num + 1).padStart(5, '0');
      }
    }
    
    // Calculate totals
    const items = data.items.map((item: any) => ({
      product: item.productId,
      productName: item.productName,
      sku: item.sku || '',
      quantity: item.quantity,
      unitCost: item.unitCost,
      discount: item.discount || 0,
      tax: item.tax || 0,
      total: item.quantity * item.unitCost - (item.discount || 0) + (item.tax || 0),
      unitName: item.unitName || item.unit || 'pcs',
      unitAbbreviation: item.unitAbbreviation || item.unit || 'pcs',
      conversionToBase: item.conversionToBase || 1,
      batchNumber: item.batchNumber,
      expiryDate: item.expiryDate,
    }));
    
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitCost), 0);
    const totalDiscount = items.reduce((sum: number, item: any) => sum + (item.discount || 0), 0);
    const totalTax = items.reduce((sum: number, item: any) => sum + (item.tax || 0), 0);
    const total = subtotal - totalDiscount + totalTax;
    const balance = total - (data.amountPaid || 0);
    
    // Determine status
    let status = data.status || 'unpaid';
    if (data.amountPaid > 0) {
      status = balance === 0 ? 'paid' : 'partially_paid';
    }
    
    // Parse dates safely
    const invoiceDate = data.invoiceDate && data.invoiceDate.trim() !== '' 
      ? new Date(data.invoiceDate) 
      : new Date();
    
    // If dueDate is not provided or empty, default to 30 days after invoice date
    let dueDate: Date;
    if (data.dueDate && data.dueDate.trim() !== '') {
      dueDate = new Date(data.dueDate);
      // Check if date is valid
      if (isNaN(dueDate.getTime())) {
        dueDate = new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      }
    } else {
      dueDate = new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
    
    const invoiceData: any = {
      invoiceNumber,
      supplier: data.supplierId,
      supplierName: data.supplierName,
      purchaseOrderNumber: data.purchaseOrderNumber,
      items,
      subtotal,
      discount: data.discount || 0,
      discountAmount: totalDiscount,
      tax: totalTax,
      total,
      amountPaid: data.amountPaid || 0,
      balance,
      status,
      invoiceDate,
      dueDate,
      notes: data.notes,
      branch: data.branchId,
    };
    
    // Only add purchaseOrder if it's a valid ObjectId
    if (data.purchaseOrderId && data.purchaseOrderId.trim() !== '') {
      invoiceData.purchaseOrder = data.purchaseOrderId;
    }
    
    console.log('Creating invoice with data:', JSON.stringify(invoiceData, null, 2));
    const invoice = await SupplierInvoice.create(invoiceData);
    console.log('Invoice created successfully:', invoice._id);
    
    // Update supplier's totalPurchases and balance
    if (invoiceData.supplier) {
      await Supplier.findByIdAndUpdate(invoiceData.supplier, {
        $inc: { totalPurchases: total, balance: total },
      });
    }
    
    // Check if this invoice is from a purchase order and update PO status if all items are fully received
    if (data.purchaseOrderId && data.purchaseOrderId.trim() !== '') {
      const purchaseOrder = await Purchase.findById(data.purchaseOrderId);
      
      if (purchaseOrder) {
        // Update received quantities for each item in the purchase order
        for (const invoiceItem of items) {
          const poItem = purchaseOrder.items.find(
            (item: any) => item.product.toString() === invoiceItem.product.toString()
          );
          
          if (poItem) {
            // Calculate base quantity using conversion rate
            const baseQuantity = invoiceItem.quantity * (invoiceItem.conversionToBase || 1);
            poItem.receivedQuantity = (poItem.receivedQuantity || 0) + baseQuantity;
          }
        }
        
        // Check if all items are fully received
        const allItemsReceived = purchaseOrder.items.every(
          (item: any) => item.receivedQuantity >= item.quantity
        );
        
        // Update purchase order status if all items are received
        if (allItemsReceived) {
          purchaseOrder.status = 'received';
          purchaseOrder.receivedDate = new Date();
          purchaseOrder.receivedBy = new mongoose.Types.ObjectId(user.userId);
          purchaseOrder.receivedByName = user.name;
        } else {
          purchaseOrder.status = 'partial';
        }
        
        await purchaseOrder.save();
        
        // Update inventory levels for each item
        for (const invoiceItem of items) {
          const baseQuantity = invoiceItem.quantity * (invoiceItem.conversionToBase || 1);
          
          // Update product stock - add to shopStock by default
          await Product.findByIdAndUpdate(invoiceItem.product, {
            $inc: {
              stockQuantity: baseQuantity,
              shopStock: baseQuantity,
            },
          });
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      invoice,
    }, { status: 201 });
  } catch (error) {
    console.error('Create supplier invoice error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { message: errorMessage, stack: errorStack });
    return NextResponse.json(
      { error: 'Failed to create supplier invoice', details: errorMessage },
      { status: 500 }
    );
  }
}
