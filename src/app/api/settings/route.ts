import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Settings from '@/models/Settings';
import { getAuthUser, hasPermission } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const branch = searchParams.get('branch');
    
    const query = branch ? { branch } : {};
    
    let settings = await Settings.findOne(query);
    
    // Create default settings if not exist
    if (!settings) {
      settings = await Settings.create({
        businessName: 'My Shop',
        taxRate: 16,
        taxName: 'VAT',
        enableTax: true,
        invoicePrefix: 'INV',
        invoiceNumber: 1,
        defaultPaymentMethod: 'cash',
        allowNegativeStock: false,
        lowStockAlert: true,
        receiptFooter: 'Thank you for shopping with us!',
        showLogoOnReceipt: true,
      });
    }
    
    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!hasPermission(user.role as any, 'manage_settings')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    await dbConnect();
    
    const data = await request.json();
    
    const { searchParams } = new URL(request.url);
    const branch = searchParams.get('branch');
    
    const query = branch ? { branch } : {};
    
    const settings = await Settings.findOneAndUpdate(
      query,
      data,
      { new: true, upsert: true }
    );
    
    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
