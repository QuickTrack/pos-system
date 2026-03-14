import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import CustomerPayment from '@/models/CustomerPayment';
import Customer from '@/models/Customer';

export async function GET(request: Request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const query: any = {};

    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { paymentId: { $regex: search, $options: 'i' } },
        { invoiceNumbers: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }

    const payments = await CustomerPayment.find(query)
      .populate('customer', 'name phone email')
      .populate('recordedBy', 'name')
      .sort({ paymentDate: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      payments: payments.map((p: any) => ({
        ...p,
        _id: p._id.toString(),
        customer: p.customer ? {
          ...p.customer,
          _id: p.customer._id.toString(),
        } : null,
        recordedBy: p.recordedBy ? {
          ...p.recordedBy,
          _id: p.recordedBy._id.toString(),
        } : null,
      })),
    });
  } catch (error) {
    console.error('Error fetching customer payments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customer payments' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { customerId, amount, paymentDate, paymentMethod, referenceNumber, invoiceNumbers, notes } = body;

    // Get customer details
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Create payment record
    const payment = new CustomerPayment({
      paymentId: '',
      customer: customerId,
      customerName: customer.name,
      amount,
      paymentDate: paymentDate || new Date(),
      paymentMethod: paymentMethod || 'cash',
      referenceNumber,
      invoiceNumbers: invoiceNumbers || [],
      status: 'pending',
      notes,
    });

    await payment.save();

    // If invoices are specified, update their payment status
    if (invoiceNumbers && invoiceNumbers.length > 0) {
      const Sale = (await import('@/models/Sale')).default;
      
      for (const invoiceNumber of invoiceNumbers) {
        const sale = await Sale.findOne({ invoiceNumber });
        if (sale) {
          const newAmountPaid = sale.amountPaid + amount;
          const newStatus = newAmountPaid >= sale.total ? 'paid' : 'partial';
          
          await Sale.findByIdAndUpdate(sale._id, {
            amountPaid: newAmountPaid,
            paymentStatus: newStatus,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      payment: {
        ...payment.toObject(),
        _id: payment._id.toString(),
      },
    });
  } catch (error) {
    console.error('Error creating customer payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create customer payment' },
      { status: 500 }
    );
  }
}