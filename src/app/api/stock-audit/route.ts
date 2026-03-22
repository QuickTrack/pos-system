import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import { StockAudit, Product } from '@/models';
import { getAuthUser } from '@/lib/auth-server';
import { User } from '@/models';

// GET /api/stock-audit - List stock audit logs
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');
    const movementType = searchParams.get('movementType');
    const location = searchParams.get('location');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const query: any = {};
    
    if (productId) {
      query.product = productId;
    }
    if (movementType && movementType !== 'all') {
      query.movementType = movementType;
    }
    if (location && location !== 'all') {
      query.location = location;
    }
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    
    const skip = (page - 1) * limit;
    
    const [logs, total] = await Promise.all([
      StockAudit.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('product', 'name sku')
        .populate('user', 'name'),
      StockAudit.countDocuments(query)
    ]);
    
    return NextResponse.json({ 
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching stock audit logs:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}

// POST /api/stock-audit - Create a manual stock adjustment
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = await User.findById(authUser.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const body = await request.json();
    const { 
      productId,
      location,
      adjustmentType, // 'add' or 'remove'
      quantity,
      reason 
    } = body;
    
    if (!productId || !location || !adjustmentType || !quantity) {
      return NextResponse.json(
        { error: 'Product, location, adjustment type, and quantity are required' },
        { status: 400 }
      );
    }
    
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    // Get current quantity at location
    const quantityBefore = location === 'shop' ? product.shopStock : product.remoteStock;
    
    // Calculate new quantity
    let quantityAfter: number;
    if (adjustmentType === 'add') {
      quantityAfter = quantityBefore + quantity;
      if (location === 'shop') {
        product.shopStock = quantityAfter;
      } else {
        product.remoteStock = quantityAfter;
      }
    } else {
      quantityAfter = quantityBefore - quantity;
      if (quantityAfter < 0) {
        return NextResponse.json(
          { error: `Insufficient stock. Current: ${quantityBefore}, Requested removal: ${quantity}` },
          { status: 400 }
        );
      }
      if (location === 'shop') {
        product.shopStock = quantityAfter;
      } else {
        product.remoteStock = quantityAfter;
      }
    }
    
    await product.save();
    
    // Create audit log
    const auditLog = await StockAudit.create({
      product: product._id,
      productName: product.name,
      productSku: product.sku,
      movementType: 'adjustment',
      quantity: adjustmentType === 'add' ? quantity : -quantity,
      quantityBefore,
      quantityAfter,
      location,
      referenceType: 'adjustment',
      user: user._id,
      userName: user.name,
      notes: reason || `Manual stock ${adjustmentType}`,
    });
    
    return NextResponse.json({ auditLog, product }, { status: 201 });
  } catch (error) {
    console.error('Error creating stock adjustment:', error);
    return NextResponse.json({ error: 'Failed to create adjustment' }, { status: 500 });
  }
}

// PUT /api/stock-audit - Bulk stock adjustment
export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = await User.findById(authUser.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const body = await request.json();
    const { 
      items, // Array of { productId, location, adjustmentType, quantity }
      reason 
    } = body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items array is required' },
        { status: 400 }
      );
    }
    
    const results = [];
    const errors = [];
    
    for (const item of items) {
      const { productId, location, adjustmentType, quantity } = item;
      
      if (!productId || !location || !adjustmentType || !quantity) {
        errors.push({ productId, error: 'Missing required fields' });
        continue;
      }
      
      const product = await Product.findById(productId);
      if (!product) {
        errors.push({ productId, error: 'Product not found' });
        continue;
      }
      
      // Get current quantity at location
      const quantityBefore = location === 'shop' 
        ? (product.shopStock !== undefined ? product.shopStock : product.stockQuantity)
        : (product.remoteStock || 0);
      
      // Calculate new quantity
      let quantityAfter: number;
      if (adjustmentType === 'add') {
        quantityAfter = quantityBefore + quantity;
      } else if (adjustmentType === 'set') {
        quantityAfter = quantity;
      } else {
        quantityAfter = quantityBefore - quantity;
      }
      
      // Validate removal
      if (adjustmentType === 'remove' && quantityAfter < 0) {
        errors.push({ 
          productId, 
          productName: product.name,
          error: `Insufficient stock. Current: ${quantityBefore}, Requested removal: ${quantity}` 
        });
        continue;
      }
      
      // Validate set
      if (adjustmentType === 'set' && quantity < 0) {
        errors.push({ 
          productId, 
          productName: product.name,
          error: 'Cannot set negative stock' 
        });
        continue;
      }
      
      // Update stock
      if (location === 'shop') {
        product.shopStock = quantityAfter;
      } else {
        product.remoteStock = quantityAfter;
      }
      product.stockQuantity = (product.shopStock || 0) + (product.remoteStock || 0);
      await product.save();
      
      // Create audit log
      const auditLog = await StockAudit.create({
        product: product._id,
        productName: product.name,
        productSku: product.sku,
        movementType: 'adjustment',
        quantity: adjustmentType === 'add' ? quantity : (adjustmentType === 'set' ? quantity - quantityBefore : -quantity),
        quantityBefore,
        quantityAfter,
        location,
        referenceType: 'adjustment',
        user: user._id,
        userName: user.name,
        notes: reason || `Bulk stock ${adjustmentType}`,
      });
      
      results.push({
        productId: product._id,
        productName: product.name,
        location,
        adjustmentType,
        quantityBefore,
        quantityAfter,
        change: adjustmentType === 'add' ? quantity : (adjustmentType === 'set' ? quantity - quantityBefore : -quantity),
        auditLogId: auditLog._id,
      });
    }
    
    return NextResponse.json({
      success: results.length,
      failed: errors.length,
      results,
      errors,
    });
  } catch (error) {
    console.error('Error creating bulk stock adjustment:', error);
    return NextResponse.json({ error: 'Failed to create bulk adjustment' }, { status: 500 });
  }
}
