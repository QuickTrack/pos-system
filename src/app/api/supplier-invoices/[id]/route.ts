import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/mongodb';
import SupplierInvoice from '@/models/SupplierInvoice';
import Supplier from '@/models/Supplier';
import Purchase from '@/models/Purchase';
import Product from '@/models/Product';
import { getAuthUser } from '@/lib/auth-server';
import '@/models';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await dbConnect();
    
    const { id } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
    }
    
    const invoice = await SupplierInvoice.findById(id)
      .populate('supplier', 'name phone email')
      .populate('items.product', 'name sku baseUnit units');
    
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      invoice,
    });
  } catch (error) {
    console.error('Get supplier invoice error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supplier invoice' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await dbConnect();
    
    const { id } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
    }
    
    const data = await request.json();
    
    console.log('Updating supplier invoice with data:', JSON.stringify(data, null, 2));
    
    // Validate required fields
    if (!data.invoiceNumber || data.invoiceNumber.trim() === '') {
      return NextResponse.json({ error: 'Invoice number is required' }, { status: 400 });
    }
    
    if (!data.supplierId) {
      return NextResponse.json({ error: 'Supplier is required' }, { status: 400 });
    }
    
    if (!data.items || data.items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }
    
    // Check if invoice exists
    const existingInvoice = await SupplierInvoice.findById(id);
    if (!existingInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    
    // Check if invoice number is unique (excluding current invoice)
    const duplicateInvoice = await SupplierInvoice.findOne({
      invoiceNumber: data.invoiceNumber,
      _id: { $ne: id },
    });
    if (duplicateInvoice) {
      return NextResponse.json({ error: 'Invoice number already exists' }, { status: 400 });
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
    const balance = total - (data.amountPaid || existingInvoice.amountPaid || 0);
    
    // Determine status
    let status = data.status || existingInvoice.status;
    if (data.amountPaid > 0) {
      status = balance === 0 ? 'paid' : 'partially_paid';
    } else if (balance > 0 && status === 'paid') {
      status = 'partially_paid';
    }
    
    // Parse dates safely
    const invoiceDate = data.invoiceDate && data.invoiceDate.trim() !== '' 
      ? new Date(data.invoiceDate) 
      : existingInvoice.invoiceDate;
    
    let dueDate: Date;
    if (data.dueDate && data.dueDate.trim() !== '') {
      dueDate = new Date(data.dueDate);
      // Check if date is valid
      if (isNaN(dueDate.getTime())) {
        dueDate = existingInvoice.dueDate || new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      }
    } else {
      dueDate = existingInvoice.dueDate || new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
    
    // Update invoice
    const updateData: any = {
      invoiceNumber: data.invoiceNumber,
      supplier: data.supplierId,
      supplierName: data.supplierName,
      purchaseOrderNumber: data.purchaseOrderNumber,
      items,
      subtotal,
      discount: data.discount || 0,
      discountAmount: totalDiscount,
      tax: totalTax,
      total,
      balance,
      status,
      invoiceDate,
      dueDate,
      notes: data.notes,
      branch: data.branchId,
    };
    
    // Only add purchaseOrder if it's a valid ObjectId
    if (data.purchaseOrderId && data.purchaseOrderId.trim() !== '') {
      updateData.purchaseOrder = data.purchaseOrderId;
    } else {
      updateData.purchaseOrder = null;
    }
    
    console.log('Updating invoice with data:', JSON.stringify(updateData, null, 2));
    const updatedInvoice = await SupplierInvoice.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('supplier', 'name phone email');
    console.log('Invoice updated successfully:', updatedInvoice?._id);
    
    // Update supplier's totalPurchases and balance if supplier changed
    if (data.supplierId !== existingInvoice.supplier.toString()) {
      // Revert old supplier's balance
      await Supplier.findByIdAndUpdate(existingInvoice.supplier, {
        $inc: { totalPurchases: -existingInvoice.total, balance: -existingInvoice.total },
      });
      
      // Update new supplier's balance
      await Supplier.findByIdAndUpdate(data.supplierId, {
        $inc: { totalPurchases: total, balance: total },
      });
    } else if (total !== existingInvoice.total) {
      // Update same supplier's balance with the difference
      const difference = total - existingInvoice.total;
      await Supplier.findByIdAndUpdate(data.supplierId, {
        $inc: { totalPurchases: difference, balance: difference },
      });
    }
    
    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
    });
  } catch (error) {
    console.error('Update supplier invoice error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { message: errorMessage, stack: errorStack });
    return NextResponse.json(
      { error: 'Failed to update supplier invoice', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await dbConnect();
    
    const { id } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
    }
    
    const invoice = await SupplierInvoice.findById(id);
    
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    
    // Revert supplier's totalPurchases and balance
    if (invoice.supplier) {
      await Supplier.findByIdAndUpdate(invoice.supplier, {
        $inc: { totalPurchases: -invoice.total, balance: -invoice.total },
      });
    }
    
    await SupplierInvoice.findByIdAndDelete(id);
    
    return NextResponse.json({
      success: true,
      message: 'Invoice deleted successfully',
    });
  } catch (error) {
    console.error('Delete supplier invoice error:', error);
    return NextResponse.json(
      { error: 'Failed to delete supplier invoice' },
      { status: 500 }
    );
  }
}
