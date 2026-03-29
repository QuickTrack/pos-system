import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import SupplierPayment from '@/models/SupplierPayment';
import Purchase from '@/models/Purchase';
import Supplier from '@/models/Supplier';
import SupplierInvoice from '@/models/SupplierInvoice';
import '@/models';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const supplier = searchParams.get('supplier');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const query: any = {};
    
    if (supplier) query.supplier = supplier;
    if (status) query.status = status;
    
    if (startDate && endDate) {
      query.paymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    
    const skip = (page - 1) * limit;
    
    const [payments, total] = await Promise.all([
      SupplierPayment.find(query)
        .populate('supplier', 'name phone')
        .sort({ paymentDate: -1 })
        .skip(skip)
        .limit(limit),
      SupplierPayment.countDocuments(query),
    ]);
    
    return NextResponse.json({
      success: true,
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get supplier payments error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supplier payments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await dbConnect();
  
  try {
    await dbConnect();
    
    const data = await request.json();
    
    // Accept both 'supplier' and 'supplierId' field names
    const supplierId = data.supplier || data.supplierId;
    
    // Validate supplier exists
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      );
    }
    
    // If invoice numbers provided, update related purchases and supplier invoices
    if (data.invoiceNumbers && data.invoiceNumbers.length > 0) {
      for (const orderNumber of data.invoiceNumbers) {
        // Update Purchase model
        await Purchase.findOneAndUpdate(
          { orderNumber },
          { 
            $inc: { amountPaid: data.amount },
            $set: {
              balance: 0,
              paymentStatus: 'paid'
            }
          }
        );
        
        // Update SupplierInvoice model
        await SupplierInvoice.findOneAndUpdate(
          { invoiceNumber: orderNumber },
          { 
            $inc: { amountPaid: data.amount },
            $set: {
              balance: 0,
              status: 'paid'
            }
          }
        );
      }
    }
    
    const payment = await SupplierPayment.create({
      supplier: supplierId,
      supplierName: supplier.name,
      amount: data.amount,
      paymentDate: data.paymentDate || new Date(),
      paymentMethod: data.paymentMethod || 'cheque',
      invoiceNumbers: data.invoiceNumbers || [],
      status: data.invoiceNumbers?.length > 0 ? 'paid' : 'pending',
      notes: data.notes,
      // Cheque fields
      chequeNumber: data.chequeNumber,
      bankName: data.bankName,
      bankBranch: data.bankBranch,
      // M-Pesa fields
      mpesaTransactionId: data.mpesaTransactionId,
    });
    
    // Update supplier's balance (reduce the amount owed)
    await Supplier.findByIdAndUpdate(supplierId, {
      $inc: { balance: -data.amount },
    });
    
    return NextResponse.json({
      success: true,
      payment,
    }, { status: 201 });
  } catch (error) {
    console.error('Create supplier payment error:', error);
    return NextResponse.json(
      { error: 'Failed to create supplier payment' },
      { status: 500 }
    );
  }
}