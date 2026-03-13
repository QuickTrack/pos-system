import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Purchase from '@/models/Purchase';
import '@/models';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplier');
    
    const query: any = {
      paymentStatus: { $in: ['unpaid', 'partial'] },
      status: { $in: ['received', 'ordered'] },
    };
    
    if (supplierId) {
      query.supplier = supplierId;
    }
    
    const purchases = await Purchase.find(query)
      .select('orderNumber supplierName total amountPaid balance status paymentStatus orderDate')
      .sort({ orderDate: -1 });
    
    // Group by supplier
    const supplierInvoices: Record<string, {
      supplierId: string | null;
      supplierName: string;
      invoices: any[];
      totalOutstanding: number;
    }> = {};
    
    for (const purchase of purchases) {
      const supplierKey = purchase.supplier?.toString() || purchase.supplierName;
      if (!supplierInvoices[supplierKey]) {
        supplierInvoices[supplierKey] = {
          supplierId: purchase.supplier,
          supplierName: purchase.supplierName,
          invoices: [],
          totalOutstanding: 0,
        };
      }
      supplierInvoices[supplierKey].invoices.push({
        orderNumber: purchase.orderNumber,
        total: purchase.total,
        amountPaid: purchase.amountPaid,
        balance: purchase.balance,
        status: purchase.status,
        paymentStatus: purchase.paymentStatus,
        orderDate: purchase.orderDate,
      });
      supplierInvoices[supplierKey].totalOutstanding += purchase.balance;
    }
    
    return NextResponse.json({
      success: true,
      supplierInvoices: Object.values(supplierInvoices),
    });
  } catch (error) {
    console.error('Get supplier invoices error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supplier invoices' },
      { status: 500 }
    );
  }
}