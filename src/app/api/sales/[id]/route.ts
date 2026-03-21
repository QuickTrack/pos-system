import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Sale from '@/models/Sale';
import { getAuthUser } from '@/lib/auth-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    const { id } = await params;
    
    const sale = await Sale.findById(id)
      .populate('customer', 'name phone email')
      .populate('cashier', 'name')
      .populate('branch', 'name');
    
    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      sale,
    });
  } catch (error) {
    console.error('Get sale error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sale' },
      { status: 500 }
    );
  }
}
