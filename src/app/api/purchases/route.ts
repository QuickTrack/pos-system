import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Purchase from '@/models/Purchase';
// Import all models to register them with Mongoose
import '@/models';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');
    const supplier = searchParams.get('supplier');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const query: any = {};
    
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (supplier) query.supplier = supplier;
    
    if (startDate && endDate) {
      query.orderDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    
    const skip = (page - 1) * limit;
    
    const [purchases, total] = await Promise.all([
      Purchase.find(query)
        .populate('supplier', 'name phone')
        .populate('branch', 'name')
        .populate('items.product', 'name baseUnit units')
        .sort({ orderDate: -1 })
        .skip(skip)
        .limit(limit),
      Purchase.countDocuments(query),
    ]);
    
    return NextResponse.json({
      success: true,
      purchases,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get purchases error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchases' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const data = await request.json();
    
    // Use provided orderNumber or generate one
    const orderNumber = data.orderNumber || `PO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const items = data.items.map((item: any) => ({
      product: item.productId,
      productName: item.productName,
      sku: item.sku || '',
      quantity: item.quantity,
      unitCost: item.unitCost,
      total: item.quantity * item.unitCost,
      receivedQuantity: 0,
      expiryDate: item.expiryDate,
      unitName: item.unit || item.productDetails?.baseUnit || 'pcs',
      unitAbbreviation: item.unit || item.productDetails?.baseUnit || 'pcs',
      conversionToBase: item.conversionToBase || 1,
    }));
    
    const subtotal = items.reduce((sum: number, item: any) => sum + item.total, 0);
    const discountAmount = data.discountType === 'percentage'
      ? (subtotal * data.discount) / 100
      : (data.discount || 0);
    const taxableAmount = subtotal - discountAmount;
    
    // Get settings to check if prices include tax
    const Settings = (await import('@/models/Settings')).default;
    const settings = await Settings.findOne().lean();
    const includeInPrice = settings?.includeInPrice || false;
    const taxRate = settings?.taxRate || 16;
    
    let tax = 0;
    let total = 0;
    
    if (includeInPrice) {
      // Prices already include VAT - reverse calculate tax for display
      const netAmount = taxableAmount / (1 + taxRate / 100);
      tax = taxableAmount - netAmount;
      total = taxableAmount; // Total is the VAT-inclusive amount, no extra tax added
    } else {
      // Prices are VAT-exclusive - calculate and add tax
      tax = taxableAmount * (taxRate / 100);
      total = taxableAmount + tax;
    }
    const balance = total - (data.amountPaid || 0);
    
    const purchaseData: any = {
      orderNumber,
      supplier: data.supplierId,
      supplierName: data.supplierName,
      items,
      subtotal,
      discount: data.discount || 0,
      discountAmount,
      tax,
      total,
      amountPaid: data.amountPaid || 0,
      balance,
      status: 'pending',
      paymentStatus: balance === 0 ? 'paid' : balance < total ? 'partial' : 'unpaid',
      paymentMethod: data.paymentMethod,
      orderDate: new Date(),
      expectedDeliveryDate: data.expectedDeliveryDate,
      notes: data.notes,
      taxRate,
      includeInPrice,
    };
    
    // Only add branch if provided
    if (data.branchId) {
      purchaseData.branch = data.branchId;
    }
    
    const purchase = await Purchase.create(purchaseData);
    
    return NextResponse.json({
      success: true,
      purchase,
    }, { status: 201 });
  } catch (error) {
    console.error('Create purchase error:', error);
    return NextResponse.json(
      { error: 'Failed to create purchase' },
      { status: 500 }
    );
  }
}
