import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Purchase from '@/models/Purchase';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
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
    
    if (user.role !== 'admin' && user.branch) {
      query.branch = user.branch;
    }
    
    const skip = (page - 1) * limit;
    
    const [purchases, total] = await Promise.all([
      Purchase.find(query)
        .populate('supplier', 'name phone')
        .populate('branch', 'name')
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
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await dbConnect();
    
    const data = await request.json();
    
    const orderNumber = `PO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const items = data.items.map((item: any) => ({
      product: item.productId,
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      unitCost: item.unitCost,
      total: item.quantity * item.unitCost,
      receivedQuantity: 0,
      expiryDate: item.expiryDate,
    }));
    
    const subtotal = items.reduce((sum: number, item: any) => sum + item.total, 0);
    const discountAmount = data.discountType === 'percentage'
      ? (subtotal * data.discount) / 100
      : (data.discount || 0);
    const taxableAmount = subtotal - discountAmount;
    const tax = taxableAmount * 0.16;
    const total = taxableAmount + tax;
    const balance = total - (data.amountPaid || 0);
    
    const purchase = await Purchase.create({
      orderNumber,
      supplier: data.supplierId,
      supplierName: data.supplierName,
      branch: user.branch || data.branchId,
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
    });
    
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
