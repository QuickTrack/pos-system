import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import CustomerInvoice from '@/models/CustomerInvoice';
import Customer from '@/models/Customer';
import Product from '@/models/Product';
import { getAuthUser } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';

// Generate invoice number
function generateInvoiceNumber(): string {
  const prefix = 'INV';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customer = searchParams.get('customer');
    const overdue = searchParams.get('overdue');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const query: any = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (customer) {
      query.customer = customer;
    }
    
    // Check for overdue invoices
    if (overdue === 'true') {
      query.status = { $in: ['sent', 'partial'] };
      query.dueDate = { $lt: new Date() };
    }
    
    if (user.role !== 'admin' && user.branch) {
      query.branch = user.branch;
    }
    
    const skip = (page - 1) * limit;
    
    const [invoices, total] = await Promise.all([
      CustomerInvoice.find(query)
        .populate('customer', 'name phone creditLimit')
        .sort({ invoiceDate: -1 })
        .skip(skip)
        .limit(limit),
      CustomerInvoice.countDocuments(query),
    ]);
    
    // Calculate totals
    const summary = await CustomerInvoice.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$total' },
          totalPaid: { $sum: '$amountPaid' },
          totalBalance: { $sum: '$balanceDue' },
        },
      },
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
      summary: summary[0] || { totalAmount: 0, totalPaid: 0, totalBalance: 0 },
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
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
    
    if (!hasPermission(user.role as any, 'manage_sales')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    await dbConnect();
    
    const data = await request.json();
    
    // Validate customer
    const customer = await Customer.findById(data.customerId);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 400 });
    }
    
    // Calculate totals
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    
    const items = data.items.map((item: any) => {
      const itemSubtotal = item.unitPrice * item.quantity;
      const itemDiscount = item.discountType === 'percentage'
        ? (itemSubtotal * item.discount) / 100
        : item.discount;
      const itemTax = (itemSubtotal - itemDiscount) * (data.taxRate || 16) / 100;
      const itemTotal = itemSubtotal - itemDiscount + itemTax;
      
      subtotal += itemSubtotal;
      totalDiscount += itemDiscount;
      totalTax += itemTax;
      
      return {
        product: item.productId,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        discountType: item.discountType,
        tax: itemTax,
        total: itemTotal,
      };
    });
    
    const orderDiscountAmount = data.discountType === 'percentage'
      ? (subtotal * data.discount) / 100
      : (data.discount || 0);
    
    const taxableAmount = subtotal - orderDiscountAmount;
    const taxRate = data.taxRate || 16;
    const orderTax = taxableAmount * taxRate / 100;
    const total = taxableAmount + orderTax;
    
    // Calculate due date based on payment terms
    const paymentTerms = data.paymentTerms || 30;
    const dueDate = data.dueDate ? new Date(data.dueDate) : new Date();
    if (!data.dueDate) {
      dueDate.setDate(dueDate.getDate() + paymentTerms);
    }
    
    // Get branch from user or data
    let branch = user.branch || data.branchId;
    const createdBy = user.userId;
    const createdByName = user.name;
    
    // If no branch, fetch default branch
    if (!branch) {
      const Branch = (await import('@/models/Branch')).default;
      const defaultBranch = await Branch.findOne();
      if (defaultBranch) {
        branch = defaultBranch._id.toString();
      }
    }
    
    // Create invoice
    const invoice = await CustomerInvoice.create({
      invoiceNumber: data.invoiceNumber || generateInvoiceNumber(),
      customer: customer._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: customer.address,
      customerKraPin: customer.kraPin,
      creditLimit: customer.creditLimit,
      paymentTerms,
      dueDate,
      invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : new Date(),
      items,
      subtotal,
      discount: data.discount || 0,
      discountType: data.discountType,
      discountAmount: orderDiscountAmount,
      tax: orderTax,
      taxRate,
      total,
      amountPaid: 0,
      balanceDue: total,
      status: 'draft',
      branch,
      createdBy,
      createdByName,
      notes: data.notes,
      payments: [],
      terms: data.terms,
    });
    
    return NextResponse.json({
      success: true,
      invoice,
    }, { status: 201 });
  } catch (error) {
    console.error('Create invoice error:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
