import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Product from '@/models/Product';
import Category from '@/models/Category';
import { getAuthUser, hasPermission } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const lowStock = searchParams.get('lowStock');
    const branch = searchParams.get('branch');
    
    const query: any = { isActive: true };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (category) {
      query.category = category;
    }
    
    if (branch) {
      query.branch = branch;
    }
    
    if (lowStock === 'true') {
      query.$expr = {
        $lte: ['$stockQuantity', '$lowStockThreshold']
      };
    }
    
    const skip = (page - 1) * limit;
    
    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('category', 'name')
        .populate('supplier', 'name')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(query),
    ]);
    
    return NextResponse.json({
      success: true,
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
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
    
    if (!hasPermission(user.role as any, 'manage_products')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    await dbConnect();
    
    const data = await request.json();
    
    // Generate SKU if not provided
    if (!data.sku) {
      const category = await Category.findById(data.category);
      const categoryCode = category?.code || 'GEN';
      data.sku = `${categoryCode}${Date.now()}`;
    }
    
    // Generate barcode if not provided
    if (!data.barcode) {
      data.barcode = Math.floor(Math.random() * 1000000000000).toString();
    }
    
    const product = await Product.create(data);
    
    return NextResponse.json({
      success: true,
      product,
    }, { status: 201 });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
