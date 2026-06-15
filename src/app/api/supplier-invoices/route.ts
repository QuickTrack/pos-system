import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/mongodb';
import SupplierInvoice from '@/models/SupplierInvoice';
import Supplier from '@/models/Supplier';
import Purchase from '@/models/Purchase';
import Product from '@/models/Product';
import { getAuthUser } from '@/lib/auth-server';
import '@/models';

async function getNextSupplierInvoiceNumber(): Promise<string> {
  const lastInvoice = await SupplierInvoice.findOne({ invoiceNumber: /^\d{5}$/ }).sort({ createdAt: -1 });
  const sequence = lastInvoice?.invoiceNumber ? parseInt(lastInvoice.invoiceNumber, 10) || 0 : 0;
  return String(sequence + 1).padStart(5, '0');
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    
    if (searchParams.get('next') === 'true') {
      return NextResponse.json({
        success: true,
        nextInvoiceNumber: await getNextSupplierInvoiceNumber(),
      });
    }
    
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
    
    // Validate required fields
    if (!data.supplierId || !mongoose.Types.ObjectId.isValid(String(data.supplierId))) {
      return NextResponse.json({ error: 'Valid supplier is required' }, { status: 400 });
    }
    if (!data.items || data.items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }
    
    // Use invoice number from form if provided, otherwise generate one
    let invoiceNumber = typeof data.invoiceNumber === 'string' ? data.invoiceNumber.trim() : '';
    if (!invoiceNumber) {
      invoiceNumber = await getNextSupplierInvoiceNumber();
    }
    
    const existingInvoice = await SupplierInvoice.findOne({ invoiceNumber });
    if (existingInvoice) {
      return NextResponse.json({ error: 'Invoice number already exists' }, { status: 400 });
    }
    
    const purchaseOrderId = typeof data.purchaseOrderId === 'string' && data.purchaseOrderId.trim() !== ''
      ? data.purchaseOrderId.trim()
      : '';
    
    if (purchaseOrderId && !mongoose.Types.ObjectId.isValid(purchaseOrderId)) {
      return NextResponse.json({ error: 'Invalid purchase order ID' }, { status: 400 });
    }
    
    const purchaseOrder = purchaseOrderId ? await Purchase.findById(purchaseOrderId) : null;
    if (purchaseOrderId && !purchaseOrder) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }
    
    const itemValidationErrors: string[] = [];
    const items = data.items.map((item: any, index: number) => {
      const productId = typeof item.productId === 'string' ? item.productId.trim() : item.productId;
      const quantity = Number(item.quantity);
      const unitCost = Number(item.unitCost);
      const discount = Number(item.discount || 0);
      const tax = Number(item.tax || 0);
      const productDetails = item.productDetails || {};
      const unitName = item.unitName || item.unit || productDetails.baseUnit || 'pcs';
      const unitAbbreviation = item.unitAbbreviation || item.unit || productDetails.baseUnit || 'pcs';
      const selectedUnit = productDetails.units?.find((unit: any) =>
        unit.name === unitName ||
        unit.abbreviation === unitName ||
        unit.name === unitAbbreviation ||
        unit.abbreviation === unitAbbreviation
      );
      const conversionToBase = selectedUnit?.conversionToBase || productDetails.conversionToBase || 1;
      
      if (!mongoose.Types.ObjectId.isValid(String(productId))) {
        itemValidationErrors.push(`Item ${index + 1}: valid product is required`);
      }
      if (!Number.isFinite(quantity) || quantity <= 0) {
        itemValidationErrors.push(`Item ${index + 1}: quantity must be greater than 0`);
      }
      if (!Number.isFinite(unitCost) || unitCost < 0) {
        itemValidationErrors.push(`Item ${index + 1}: unit cost must be 0 or greater`);
      }
      if (!Number.isFinite(discount) || discount < 0) {
        itemValidationErrors.push(`Item ${index + 1}: discount must be 0 or greater`);
      }
      if (!Number.isFinite(tax) || tax < 0) {
        itemValidationErrors.push(`Item ${index + 1}: tax must be 0 or greater`);
      }
      
      return {
        product: productId,
        productName: item.productName || productDetails.name || 'Unknown product',
        sku: item.sku || productDetails.sku || '',
        quantity,
        unitCost,
        discount,
        tax,
        total: quantity * unitCost - discount + tax,
        unitName,
        unitAbbreviation,
        conversionToBase,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
      };
    });
    
    if (itemValidationErrors.length > 0) {
      return NextResponse.json({ error: itemValidationErrors.join('; ') }, { status: 400 });
    }
    
    const normalizedItems = items.map((item: any) => ({
      ...item,
      product: new mongoose.Types.ObjectId(String(item.product)),
    }));
    
    // Calculate totals
    const subtotal = normalizedItems.reduce((sum: number, item: any) => sum + (item.quantity * item.unitCost), 0);
    const totalDiscount = normalizedItems.reduce((sum: number, item: any) => sum + (item.discount || 0), 0);
    const totalTax = normalizedItems.reduce((sum: number, item: any) => sum + (item.tax || 0), 0);
    const total = subtotal - totalDiscount + totalTax;
    const amountPaid = Number(data.amountPaid || 0);
    const balance = total - amountPaid;
    
    // Determine status
    let status = data.status || 'unpaid';
    if (amountPaid > 0) {
      status = balance === 0 ? 'paid' : 'partially_paid';
    }
    
    // Parse dates safely
    const invoiceDate = data.invoiceDate && data.invoiceDate.trim() !== '' 
      ? new Date(data.invoiceDate) 
      : new Date();
    
    if (isNaN(invoiceDate.getTime())) {
      return NextResponse.json({ error: 'Invalid invoice date' }, { status: 400 });
    }
    
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
      items: normalizedItems,
      subtotal,
      discount: data.discount || 0,
      discountAmount: totalDiscount,
      tax: totalTax,
      total,
      amountPaid,
      balance,
      status,
      invoiceDate,
      dueDate,
      notes: data.notes,
      branch: data.branchId,
    };
    
    // Only add purchaseOrder if it's a valid ObjectId
    if (purchaseOrderId) {
      invoiceData.purchaseOrder = purchaseOrderId;
    }
    
    const invoice = await SupplierInvoice.create(invoiceData);
    
    // Update supplier's totalPurchases and balance
    if (invoiceData.supplier) {
      await Supplier.findByIdAndUpdate(invoiceData.supplier, {
        $inc: { totalPurchases: total, balance: total },
      });
    }
    
    // Check if this invoice is from a purchase order and update PO status if all items are fully received
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
    }
    
    // Update inventory levels for each received item
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
