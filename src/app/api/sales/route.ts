import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import { Sale, Product, Customer, User, Branch, Settings, ActivityLog } from '@/models';
import { getAuthUser } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';
import { 
  generateInvoiceNumber, 
  generateCashSaleNumber,
  generateInvoiceNumberWithFY,
  generateCashSaleNumberWithFY,
  checkAndUpdateFinancialYear,
  getFinancialYear,
  FinancialYearConfig
} from '@/lib/utils';

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
        .populate('items.product', 'name baseUnit units')
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch sales', details: errorMessage },
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
    
    // Get settings
    const settingsData = await Settings.findOne({}).lean();
    const allowNegativeStock = settingsData?.allowNegativeStock || false;
    
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
    
    // Determine if this is a cash sale (cash, mpesa, card)
    const isCashSale = ['cash', 'mpesa', 'card'].includes(data.paymentMethod);
    
    // Get settings and check for financial year transition
    // (settingsData already fetched above for allowNegativeStock check)
    const invoicePrefix = settingsData?.invoicePrefix || 'INV';
    const cashSalePrefix = settingsData?.cashSalePrefix || 'CSH';
    const financialYearStartMonth = settingsData?.financialYearStartMonth || 7;
    let currentFinancialYear = settingsData?.currentFinancialYear || getFinancialYear(new Date(), financialYearStartMonth);
    
    // Convert to plain object for invoiceNumbersByYear
    const invoiceNumbersByYear: Record<string, number> = settingsData?.invoiceNumbersByYear 
      ? settingsData.invoiceNumbersByYear as Record<string, number>
      : {};
    const cashSaleNumbersByYear: Record<string, number> = settingsData?.cashSaleNumbersByYear 
      ? settingsData.cashSaleNumbersByYear as Record<string, number>
      : {};
    
    // Check if we've entered a new financial year
    const today = new Date();
    const newFinancialYear = getFinancialYear(today, financialYearStartMonth);
    let isNewYear = false;
    
    if (newFinancialYear !== currentFinancialYear) {
      isNewYear = true;
      // Log the year transition
      try {
        await ActivityLog.create({
          user: user.userId as any,
          userName: user.name || 'System',
          action: 'year_transition',
          module: 'system',
          description: `Financial year transitioned from ${currentFinancialYear} to ${newFinancialYear}`,
          metadata: {
            previousYear: currentFinancialYear,
            newYear: newFinancialYear,
            transitionDate: today
          }
        });
      } catch (e) {
        console.error('Failed to log year transition:', e);
      }
      currentFinancialYear = newFinancialYear;
      // Initialize counters for new year if not exist
      if (!invoiceNumbersByYear[currentFinancialYear]) {
        invoiceNumbersByYear[currentFinancialYear] = 1;
      }
      if (!cashSaleNumbersByYear[currentFinancialYear]) {
        cashSaleNumbersByYear[currentFinancialYear] = 1;
      }
    }
    
    let invoiceNumber: string;
    let updateFields: any = {
      currentFinancialYear,
      lastYearTransitionDate: isNewYear ? today : settingsData?.lastYearTransitionDate
    };
    
    if (isCashSale) {
      // Use sequential cash sale numbering with financial year (CSH-2025-2026-00001)
      const currentNumber = cashSaleNumbersByYear[currentFinancialYear] || 1;
      const { invoiceNumber: cashNumber, newNumber } = generateCashSaleNumberWithFY(
        cashSalePrefix,
        currentFinancialYear,
        currentNumber
      );
      invoiceNumber = cashNumber;
      
      // Update the cash sale number for this financial year
      cashSaleNumbersByYear[currentFinancialYear] = newNumber;
      updateFields.cashSaleNumbersByYear = cashSaleNumbersByYear;
    } else {
      // Use invoice numbering with financial year (INV-2025-2026-00001)
      const currentNumber = invoiceNumbersByYear[currentFinancialYear] || 1;
      const { invoiceNumber: invNumber, newNumber } = generateInvoiceNumberWithFY(
        invoicePrefix,
        currentFinancialYear,
        currentNumber
      );
      invoiceNumber = invNumber;
      
      // Update the invoice number for this financial year
      invoiceNumbersByYear[currentFinancialYear] = newNumber;
      updateFields.invoiceNumbersByYear = invoiceNumbersByYear;
    }
    
    // Update settings with new counters and potentially new financial year
    await Settings.updateOne({}, { $set: updateFields });
    
    // Calculate totals
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let profit = 0;
    const taxRate = data.taxRate || 16;
    const includeInPrice = data.includeInPrice ?? false;
    
    const items = data.items.map((item: any) => {
      // Calculate item total as straightforward QTY * RATE multiplication
      // No additional VAT calculations or adjustments applied to individual line items
      const itemSubtotal = item.unitPrice * item.quantity;
      const itemDiscount = item.discountType === 'percentage'
        ? (itemSubtotal * item.discount) / 100
        : item.discount;
      
      // For item tax calculation, we use 16% of the net amount for display purposes
      // This represents the VAT component but is not added to the total
      const netAmount = itemSubtotal - itemDiscount;
      const itemTax = (netAmount * taxRate) / 100;
      
      // Item total is simply QTY * RATE minus discount (no hidden fees)
      const itemTotal = netAmount;
      
      const costPrice = item.costPrice || 0;
      const itemProfit = (netAmount - costPrice) * item.quantity;
      
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
    
    const orderTaxableAmount = subtotal - orderDiscountAmount;
    let orderTax: number;
    let orderTotal: number;
    
    if (includeInPrice) {
      // Prices already include VAT - reverse calculate
      const netAmount = orderTaxableAmount / (1 + taxRate / 100);
      orderTax = orderTaxableAmount - netAmount;
      orderTotal = orderTaxableAmount; // Total is the VAT-inclusive amount
    } else {
      // Prices are VAT-exclusive - calculate tax on top
      orderTax = data.applyTax !== false ? orderTaxableAmount * taxRate / 100 : 0;
      orderTotal = orderTaxableAmount + orderTax;
    }
    
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
        const newDebt = currentDebt + orderTotal;
        
        if (newDebt > customer.creditLimit) {
          const availableCredit = Math.max(0, customer.creditLimit - currentDebt);
          return NextResponse.json({
            error: 'Credit limit would be exceeded',
            message: `This sale would exceed the customer's credit limit of ${customer.creditLimit.toLocaleString()}`,
            currentDebt: currentDebt,
            creditLimit: customer.creditLimit,
            availableCredit,
            saleAmount: orderTotal,
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
      total: orderTotal,
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
      const productId = item.product;
      const baseQty = item.baseQuantity;
      
      // Deduct from shopStock (primary location)
      await Product.findByIdAndUpdate(productId, {
        $inc: { stockQuantity: -baseQty, shopStock: -baseQty },
      });
    }
    
    // Update customer stats if customer is provided
    if (data.customerId) {
      const updateData: any = {
        $inc: {
          totalPurchases: 1,
          totalSpent: orderTotal,
          loyaltyPoints: Math.floor(orderTotal / 100),
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
    
    // Log the sale activity
    try {
      await ActivityLog.create({
        user: user.userId as any,
        userName: user.name || 'Unknown',
        action: 'sale_create',
        module: 'sales',
        description: `Sale created: ${invoiceNumber}, Total: ${orderTotal.toLocaleString()}`,
        metadata: {
          saleId: sale._id,
          invoiceNumber,
          paymentMethod: data.paymentMethod,
          customerId: data.customerId,
          total: orderTotal
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent'),
      });
    } catch (logError) {
      console.error('Failed to log sale activity:', logError);
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
