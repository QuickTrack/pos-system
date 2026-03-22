import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Sale from '@/models/Sale';
import Product from '@/models/Product';
import Customer from '@/models/Customer';
import { getAuthUser } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';
import { generateInvoiceNumber } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const customer = searchParams.get('customer');
    const status = searchParams.get('status');
    const paymentMethod = searchParams.get('paymentMethod');
    const includeAccount = searchParams.get('includeAccount') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const query: any = {};
    
    if (startDate && endDate) {
      query.saleDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    
    if (customer) {
      query.customer = customer;
    }
    
    if (status) {
      query.status = status;
    }
    
    // Filter by payment method - for cash sales, include cash, mpesa, card, mixed
    if (paymentMethod) {
      if (paymentMethod === 'cashsales') {
        // Cash sales = all payments except account/credit
        query.paymentMethod = { $in: ['cash', 'mpesa', 'card', 'mixed'] };
      } else {
        query.paymentMethod = paymentMethod;
      }
    } else if (!includeAccount) {
      // By default, exclude account/credit payments unless explicitly included
      query.paymentMethod = { $in: ['cash', 'mpesa', 'card', 'mixed'] };
    }
    
    if (user.role !== 'admin' && user.branch) {
      query.branch = user.branch;
    }
    
    const skip = (page - 1) * limit;
    
    const [sales, total] = await Promise.all([
      Sale.find(query)
        .populate('customer', 'name phone')
        .populate('cashier', 'name')
        .populate('branch', 'name')
        .sort({ saleDate: -1 })
        .skip(skip)
        .limit(limit),
      Sale.countDocuments(query),
    ]);
    
    return NextResponse.json({
      success: true,
      sales,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get sales error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales' },
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
    
    // Generate invoice number
    const invoiceNumber = generateInvoiceNumber('INV');
    
    // Calculate totals
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let profit = 0;
    
    const items = data.items.map((item: any) => {
      const itemSubtotal = item.unitPrice * item.quantity;
      const itemDiscount = item.discountType === 'percentage'
        ? (itemSubtotal * item.discount) / 100
        : item.discount;
      const itemTax = (itemSubtotal - itemDiscount) * (data.taxRate || 16) / 100;
      const itemTotal = itemSubtotal - itemDiscount + itemTax;
      const costPrice = item.costPrice || 0;
      const itemProfit = (item.unitPrice - costPrice) * item.quantity;
      
      subtotal += itemSubtotal;
      totalDiscount += itemDiscount;
      totalTax += itemTax;
      profit += itemProfit;
      
      return {
        product: item.productId,
        productName: item.productName,
        sku: item.sku,
        barcode: item.barcode,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        discountType: item.discountType,
        tax: itemTax,
        total: itemTotal,
        costPrice: costPrice,
        variant: item.variant,
        // Unit information for multi-unit products
        unitName: item.unitName,
        unitAbbreviation: item.unitAbbreviation,
        conversionToBase: item.conversionToBase || 1,
        // Base unit quantity for inventory tracking
        baseQuantity: item.quantity * (item.conversionToBase || 1),
      };
    });
    
    // Calculate order totals
    const orderDiscountAmount = data.discountType === 'percentage'
      ? (subtotal * data.discount) / 100
      : (data.discount || 0);
    
    const taxableAmount = subtotal - orderDiscountAmount;
    const taxRate = data.taxRate || 16;
    const orderTax = data.applyTax !== false ? taxableAmount * taxRate / 100 : 0;
    const total = taxableAmount + orderTax;
    
    // Credit limit validation for account payments
    if (data.paymentMethod === 'account' && data.customerId) {
      // Fetch customer with creditLimit
      const customer = await Customer.findById(data.customerId).lean();
      
      if (customer && customer.creditLimit && customer.creditLimit > 0) {
        // Calculate current outstanding balance from unpaid sales
        const currentOutstanding = await Sale.aggregate([
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
        
        const currentDebt = currentOutstanding.length > 0 ? currentOutstanding[0].totalOutstanding : 0;
        const newDebt = currentDebt + total;
        
        if (newDebt > customer.creditLimit) {
          const availableCredit = Math.max(0, customer.creditLimit - currentDebt);
          return NextResponse.json({
            error: 'Credit limit would be exceeded',
            message: `This sale would exceed the customer's credit limit of ${customer.creditLimit.toLocaleString()}`,
            currentDebt: currentDebt,
            creditLimit: customer.creditLimit,
            availableCredit,
            saleAmount: total,
            wouldExceedBy: newDebt - customer.creditLimit
          }, { status: 400 });
        }
      }
    }
    
    // Create sale
    const sale = await Sale.create({
      invoiceNumber,
      customer: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail,
      customerAddress: data.customerAddress,
      branch: user.branch || data.branchId,
      cashier: user.userId,
      cashierName: user.name,
      items,
      subtotal,
      discount: data.discount || 0,
      discountType: data.discountType,
      discountAmount: orderDiscountAmount,
      tax: orderTax,
      taxRate,
      total,
      paymentMethod: data.paymentMethod,
      paymentDetails: data.paymentDetails,
      amountPaid: data.amountPaid,
      change: data.change || 0,
      status: 'completed',
      mpesaReference: data.mpesaReference,
      mpesaPhone: data.mpesaPhone,
      mpesaTransactionId: data.mpesaTransactionId,
      profit,
      notes: data.notes,
      saleDate: new Date(),
    });
    
    // Update product stock using base unit quantity
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stockQuantity: -item.baseQuantity },
      });
    }
    
    // Update customer stats if customer is provided
    if (data.customerId) {
      const updateData: any = {
        $inc: {
          totalPurchases: 1,
          totalSpent: total,
          loyaltyPoints: Math.floor(total / 100),
        },
        lastPurchaseDate: new Date(),
      };
      
      // Deduct from credit balance if credit payment (customer uses their store credit)
      // Note: creditBalance represents store credit (overpayments, returns), not debt
      if (data.paymentMethod === 'credit' && data.creditApplied) {
        updateData.$inc.creditBalance = -data.creditApplied;
      }
      
      // Note: Account payments create credit invoices (debt) - do not affect creditBalance
      // creditBalance should only represent store credit (positive balance from overpayments/returns)
      // creditLimit is used to validate account payment eligibility
      
      await Customer.findByIdAndUpdate(data.customerId, updateData);
    }
    
    return NextResponse.json({
      success: true,
      sale,
    }, { status: 201 });
  } catch (error) {
    console.error('Create sale error:', error);
    return NextResponse.json(
      { error: 'Failed to create sale' },
      { status: 500 }
    );
  }
}
