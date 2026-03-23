import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import CustomerInvoice from '@/models/CustomerInvoice';
import Customer from '@/models/Customer';
import Product from '@/models/Product';
import Settings from '@/models/Settings';
import { getAuthUser } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';

// Generate invoice number - sequential format
function generateInvoiceNumber(sequence: number): string {
  const prefix = 'INV';
  return `${prefix}-${String(sequence).padStart(4, '0')}`;
}

// Get the next invoice number
async function getNextInvoiceNumber(): Promise<string> {
  const lastInvoice = await CustomerInvoice.findOne({
    invoiceNumber: { $regex: /^INV-\d{4}$/ }
  }).sort({ invoiceNumber: -1 });
  
  let sequence = 1;
  if (lastInvoice?.invoiceNumber) {
    const parts = lastInvoice.invoiceNumber.split('-');
    if (parts.length === 2) {
      const num = parseInt(parts[1], 10);
      if (!isNaN(num)) {
        sequence = num + 1;
      }
    }
  }
  
  return generateInvoiceNumber(sequence);
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
    const next = searchParams.get('next');
    const type = searchParams.get('type'); // 'sale' or 'credit'
    
    // If 'next' parameter is provided, return the next invoice number
    if (next === 'true') {
      let nextInvoiceNumber: string;
      if (type === 'credit') {
        // Get next credit invoice number - find the highest sequence
        const lastInvoice = await CustomerInvoice.findOne({
          invoiceNumber: { $regex: /^CINV-\\d{4}$/ }
        }).sort({ invoiceNumber: -1 });
        let sequence = 1;
        if (lastInvoice?.invoiceNumber) {
          const parts = lastInvoice.invoiceNumber.split('-');
          if (parts.length === 2) {
            const num = parseInt(parts[1], 10);
            if (!isNaN(num)) {
              sequence = num + 1;
            }
          }
        }
        nextInvoiceNumber = `CINV-${String(sequence).padStart(4, '0')}`;
      } else {
        nextInvoiceNumber = await getNextInvoiceNumber();
      }
      return NextResponse.json({
        success: true,
        nextInvoiceNumber
      });
    }
    
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
        .populate('customer', 'name phone creditLimit creditBalance')
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
    
    // Get settings and check allowNegativeStock
    const settings = await Settings.findOne({}).lean();
    const allowNegativeStock = settings?.allowNegativeStock || false;
    
    // Check stock availability if allowNegativeStock is false
    if (!allowNegativeStock) {
      for (const item of data.items || []) {
        const product = await Product.findById(item.product).lean();
        if (product) {
          // Get effective stock (shopStock if available, otherwise stockQuantity)
          const availableStock = product.shopStock !== undefined && product.shopStock > 0 
            ? product.shopStock 
            : (product.stockQuantity || 0);
          
          if (availableStock < item.baseQuantity) {
            return NextResponse.json(
              { error: `Insufficient stock for ${product.name}. Available: ${availableStock}, Requested: ${item.baseQuantity}` },
              { status: 400 }
            );
          }
        }
      }
    }
    
    // Credit limit validation for sale invoices (not credit invoices)
    if (data.invoiceType === 'sale' && customer.creditLimit && customer.creditLimit > 0) {
      // Calculate current outstanding balance from unpaid invoices
      const currentOutstanding = await CustomerInvoice.aggregate([
        {
          $match: {
            customer: customer._id,
            invoiceType: 'sale',
            status: { $in: ['sent', 'partial', 'overdue'] }
          }
        },
        {
          $group: {
            _id: null,
            totalOutstanding: {
              $sum: { $subtract: ['$total', { $ifNull: ['$amountPaid', 0] }] }
            }
          }
        }
      ]);
      
      // Also check sales with account payment
      const Sale = (await import('@/models/Sale')).default;
      const salesOutstanding = await Sale.aggregate([
        {
          $match: {
            customer: customer._id,
            paymentMethod: 'account',
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            totalOutstanding: {
              $sum: { $subtract: ['$total', { $ifNull: ['$amountPaid', 0] }] }
            }
          }
        }
      ]);
      
      const currentDebt = (currentOutstanding.length > 0 ? currentOutstanding[0].totalOutstanding : 0) +
        (salesOutstanding.length > 0 ? salesOutstanding[0].totalOutstanding : 0);
      
      // We don't have the total yet, so we'll calculate it first then validate
      // This will be checked after totals are calculated
      
      // Store current debt for later validation
      data._currentDebt = currentDebt;
      data._creditLimit = customer.creditLimit;
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
    
    // Validate credit limit for sale invoices
    if (data.invoiceType === 'sale' && data._currentDebt !== undefined && data._creditLimit) {
      const newDebt = data._currentDebt + total;
      if (newDebt > data._creditLimit) {
        const availableCredit = Math.max(0, data._creditLimit - data._currentDebt);
        return NextResponse.json({
          error: 'Credit limit would be exceeded',
          message: `This invoice would exceed the customer's credit limit of ${data._creditLimit.toLocaleString()}`,
          currentDebt: data._currentDebt,
          creditLimit: data._creditLimit,
          availableCredit,
          invoiceAmount: total,
          wouldExceedBy: newDebt - data._creditLimit
        }, { status: 400 });
      }
    }
    
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
    const invoiceNumber = data.invoiceNumber || await getNextInvoiceNumber();
    const invoice = await CustomerInvoice.create({
      invoiceNumber,
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

    // Note: Do NOT update creditBalance here
    // Invoice represents debt (money customer owes), not store credit
    // creditBalance should only track store credit (overpayments, returns)
    // Account payments are tracked via invoices and customer debt APIs

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
