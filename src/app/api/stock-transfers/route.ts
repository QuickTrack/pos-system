import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import { StockTransfer, Product, StockAudit, User } from '@/models';
import { getAuthUser } from '@/lib/auth-server';

// GET /api/stock-transfers - List all transfers
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const sourceLocation = searchParams.get('sourceLocation');
    const destinationLocation = searchParams.get('destinationLocation');
    
    const query: any = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    if (sourceLocation) {
      query.sourceLocation = sourceLocation;
    }
    if (destinationLocation) {
      query.destinationLocation = destinationLocation;
    }
    
    const transfers = await StockTransfer.find(query)
      .sort({ createdAt: -1 })
      .populate('requestedBy', 'name')
      .populate('approvedBy', 'name')
      .populate('receivedBy', 'name');
    
    return NextResponse.json({ transfers });
  } catch (error) {
    console.error('Error fetching transfers:', error);
    return NextResponse.json({ error: 'Failed to fetch transfers' }, { status: 500 });
  }
}

// POST /api/stock-transfers - Create a new transfer request
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
      sourceLocation, 
      destinationLocation, 
      items, 
      notes 
    } = body;
    
    // Validate locations are different
    if (sourceLocation === destinationLocation) {
      return NextResponse.json(
        { error: 'Source and destination locations must be different' },
        { status: 400 }
      );
    }
    
    // Validate items
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one item is required' },
        { status: 400 }
      );
    }
    
    // Validate stock availability at source location
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${item.productName}` },
          { status: 400 }
        );
      }
      
      const availableStock = sourceLocation === 'shop' ? product.shopStock : product.remoteStock;
      if (availableStock < item.quantity) {
        return NextResponse.json(
          { 
            error: `Insufficient stock at ${sourceLocation}. Available: ${availableStock}, Requested: ${item.quantity}`,
            product: item.productName,
            available: availableStock,
            requested: item.quantity
          },
          { status: 400 }
        );
      }
    }
    
    // Generate transfer number
    const count = await StockTransfer.countDocuments();
    const transferNumber = `TRF-${String(count + 1).padStart(5, '0')}`;
    
    // Create transfer
    const transfer = new StockTransfer({
      transferNumber,
      sourceLocation,
      destinationLocation,
      items: items.map((item: any) => ({
        product: item.product,
        productName: item.productName,
        productSku: item.productSku,
        quantity: item.quantity,
        receivedQuantity: 0,
      })),
      notes,
      requestedBy: user._id,
      requestedByName: user.name,
      requestDate: new Date(),
      status: 'pending',
    });
    
    await transfer.save();
    
    return NextResponse.json({ transfer }, { status: 201 });
  } catch (error) {
    console.error('Error creating transfer:', error);
    return NextResponse.json({ error: 'Failed to create transfer' }, { status: 500 });
  }
}

// PATCH /api/stock-transfers - Update transfer status (approve, ship, receive, reject)
export async function PATCH(request: NextRequest) {
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
      transferId, 
      action, 
      notes,
      receivedItems 
    } = body;
    
    const transfer = await StockTransfer.findById(transferId);
    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }
    
    switch (action) {
      case 'approve':
        if (transfer.status !== 'pending') {
          return NextResponse.json(
            { error: 'Can only approve pending transfers' },
            { status: 400 }
          );
        }
        transfer.status = 'approved';
        transfer.approvedBy = user._id;
        transfer.approvedByName = user.name;
        transfer.approvalDate = new Date();
        transfer.approvalNotes = notes;
        break;
        
      case 'ship':
        if (transfer.status !== 'approved') {
          return NextResponse.json(
            { error: 'Can only ship approved transfers' },
            { status: 400 }
          );
        }
        transfer.status = 'in_transit';
        transfer.shippedBy = user._id;
        transfer.shippedByName = user.name;
        transfer.shippedDate = new Date();
        
        // Deduct stock from source
        for (const item of transfer.items) {
          const product = await Product.findById(item.product);
          if (product) {
            if (transfer.sourceLocation === 'shop') {
              product.shopStock -= item.quantity;
            } else {
              product.remoteStock -= item.quantity;
            }
            await product.save();
            
            // Create audit log for transfer out
            const quantityBefore = transfer.sourceLocation === 'shop' 
              ? product.shopStock + item.quantity 
              : product.remoteStock + item.quantity;
            const quantityAfter = transfer.sourceLocation === 'shop' 
              ? product.shopStock 
              : product.remoteStock;
              
            await StockAudit.create({
              product: product._id,
              productName: product.name,
              productSku: product.sku,
              movementType: 'transfer_out',
              quantity: -item.quantity,
              quantityBefore,
              quantityAfter,
              location: transfer.sourceLocation,
              sourceLocation: transfer.sourceLocation,
              destinationLocation: transfer.destinationLocation,
              referenceType: 'transfer',
              referenceId: transfer._id,
              referenceNumber: transfer.transferNumber,
              user: user._id,
              userName: user.name,
              notes: `Transfer ${transfer.transferNumber} shipped`,
            });
          }
        }
        break;
        
      case 'receive':
        if (transfer.status !== 'in_transit') {
          return NextResponse.json(
            { error: 'Can only receive transfers that are in transit' },
            { status: 400 }
          );
        }
        transfer.status = 'received';
        transfer.receivedBy = user._id;
        transfer.receivedByName = user.name;
        transfer.receivedDate = new Date();
        transfer.receiveNotes = notes;
        
        // Process received items (support partial receives)
        for (let i = 0; i < transfer.items.length; i++) {
          const item = transfer.items[i];
          const receivedQty = receivedItems?.[i]?.quantity ?? item.quantity;
          item.receivedQuantity = receivedQty;
          
          const product = await Product.findById(item.product);
          if (product) {
            // Add stock to destination
            if (transfer.destinationLocation === 'shop') {
              product.shopStock += receivedQty;
            } else {
              product.remoteStock += receivedQty;
            }
            await product.save();
            
            // Create audit log for transfer in
            const quantityBefore = transfer.destinationLocation === 'shop' 
              ? product.shopStock - receivedQty 
              : product.remoteStock - receivedQty;
            const quantityAfter = transfer.destinationLocation === 'shop' 
              ? product.shopStock 
              : product.remoteStock;
              
            await StockAudit.create({
              product: product._id,
              productName: product.name,
              productSku: product.sku,
              movementType: 'transfer_in',
              quantity: receivedQty,
              quantityBefore,
              quantityAfter,
              location: transfer.destinationLocation,
              sourceLocation: transfer.sourceLocation,
              destinationLocation: transfer.destinationLocation,
              referenceType: 'transfer',
              referenceId: transfer._id,
              referenceNumber: transfer.transferNumber,
              user: user._id,
              userName: user.name,
              notes: `Transfer ${transfer.transferNumber} received`,
            });
          }
        }
        
        await transfer.save();
        break;
        
      case 'reject':
        if (transfer.status !== 'pending' && transfer.status !== 'approved') {
          return NextResponse.json(
            { error: 'Can only reject pending or approved transfers' },
            { status: 400 }
          );
        }
        transfer.status = 'rejected';
        transfer.rejectedBy = user._id;
        transfer.rejectedByName = user.name;
        transfer.rejectionDate = new Date();
        transfer.rejectionReason = notes;
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    await transfer.save();
    
    return NextResponse.json({ transfer });
  } catch (error) {
    console.error('Error updating transfer:', error);
    return NextResponse.json({ error: 'Failed to update transfer' }, { status: 500 });
  }
}
