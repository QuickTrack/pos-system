import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import CustomerInvoice from '@/models/CustomerInvoice';
import Customer from '@/models/Customer';
import { getAuthUser } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    
    const invoice = await CustomerInvoice.findById(id)
      .populate('customer', 'name phone email address creditLimit')
      .populate('createdBy', 'name');
    
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      invoice,
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
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
    
    const { id } = await params;
    await dbConnect();
    
    const data = await request.json();
    const invoice = await CustomerInvoice.findById(id);
    
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    
    // Handle full invoice edit (when editMode is true)
    if (data.editMode) {
      // Only allow editing draft invoices
      if (invoice.status !== 'draft') {
        return NextResponse.json(
          { error: 'Only draft invoices can be edited' },
          { status: 400 }
        );
      }
      
      // Update customer if changed
      if (data.customerId && data.customerId !== invoice.customer.toString()) {
        invoice.customer = new mongoose.Types.ObjectId(data.customerId);
      }
      
      // Update invoice number if changed
      if (data.invoiceNumber) {
        invoice.invoiceNumber = data.invoiceNumber;
      }
      
      // Update items
      if (data.items && Array.isArray(data.items)) {
        invoice.items = data.items.map((item: any) => ({
          product: new mongoose.Types.ObjectId(item.productId),
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unitName: item.unitName,
          discount: item.discount || 0,
          discountType: item.discountType || 'fixed',
          total: item.total,
        }));
      }
      
      // Update subtotal, tax, total
      if (typeof data.subtotal === 'number') {
        invoice.subtotal = data.subtotal;
      }
      if (typeof data.tax === 'number') {
        invoice.tax = data.tax;
      }
      if (typeof data.total === 'number') {
        invoice.total = data.total;
      }
      if (typeof data.taxRate === 'number') {
        invoice.taxRate = data.taxRate;
      }
      
      // Update date if changed
      if (data.invoiceDate) {
        invoice.invoiceDate = new Date(data.invoiceDate);
      }
      
      // Update notes
      if (data.notes !== undefined) {
        invoice.notes = data.notes;
      }
      
      // Update payment terms
      if (typeof data.paymentTerms === 'number') {
        invoice.paymentTerms = data.paymentTerms;
      }
      
      await invoice.save();
      
      return NextResponse.json({
        success: true,
        invoice,
        message: 'Invoice updated successfully',
      });
    }
    
    // Handle status changes
    if (data.status) {
      // If marking as sent, update status
      if (data.status === 'sent' && invoice.status === 'draft') {
        invoice.status = 'sent';
      }
      
      // If cancelling
      if (data.status === 'cancelled') {
        if (!hasPermission(user.role as any, 'manage_sales')) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        invoice.status = 'cancelled';
      }
    }
    
    // Handle payments
    if (data.payment) {
      const payment = data.payment;
      
      // Add payment to invoice
      invoice.payments.push({
        amount: payment.amount,
        date: new Date(),
        method: payment.method,
        reference: payment.reference,
        notes: payment.notes,
        recordedBy: new mongoose.Types.ObjectId(user.userId),
      });
      
      // Update amounts
      invoice.amountPaid += payment.amount;
      invoice.balanceDue = invoice.total - invoice.amountPaid;
      
      // Update status based on payment
      if (invoice.balanceDue <= 0) {
        invoice.status = 'paid';
        invoice.balanceDue = 0;
      } else if (invoice.amountPaid > 0) {
        invoice.status = 'partial';
      }
      
      // Update customer credit balance only if payment method is 'credit'
      // (customer used their store credit to pay)
      if (payment.method === 'credit') {
        await Customer.findByIdAndUpdate(invoice.customer, {
          $inc: { creditBalance: -payment.amount },
        });
      }
    }
    
    await invoice.save();
    
    return NextResponse.json({
      success: true,
      invoice,
    });
  } catch (error) {
    console.error('Update invoice error:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice' },
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
    
    if (!hasPermission(user.role as any, 'manage_sales')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const { id } = await params;
    await dbConnect();
    
    const invoice = await CustomerInvoice.findById(id);
    
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    
    // Only allow deletion of draft or cancelled invoices
    if (!['draft', 'cancelled'].includes(invoice.status)) {
      return NextResponse.json(
        { error: 'Cannot delete invoice with payments. Cancel it instead.' },
        { status: 400 }
      );
    }
    
    await CustomerInvoice.findByIdAndDelete(id);
    
    return NextResponse.json({
      success: true,
      message: 'Invoice deleted successfully',
    });
  } catch (error) {
    console.error('Delete invoice error:', error);
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}
