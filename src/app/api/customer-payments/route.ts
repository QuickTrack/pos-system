import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import CustomerPayment from '@/models/CustomerPayment';
import Customer from '@/models/Customer';
import CustomerInvoice from '@/models/CustomerInvoice';
import { getAuthUser } from '@/lib/auth-server';
import mongoose from 'mongoose';

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
    
    // Get authenticated user
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { customerId, amount, paymentDate, paymentMethod, referenceNumber, invoiceNumbers, notes, status: paymentStatus } = body;

    // Get customer details
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Validate that invoices are not already fully paid
    if (invoiceNumbers && invoiceNumbers.length > 0) {
      const Sale = (await import('@/models/Sale')).default;
      const paidInvoices: string[] = [];

      for (const invoiceNumber of invoiceNumbers) {
        // Check Sale invoices - cash/mpesa/card sales are always paid, account/credit need checking
        const sale = await Sale.findOne({ invoiceNumber });
        if (sale) {
          // Sales with cash, mpesa, card, mixed are always paid
          const paidMethods = ['cash', 'mpesa', 'card', 'mixed'];
          if (paidMethods.includes(sale.paymentMethod) || sale.status === 'completed') {
            paidInvoices.push(invoiceNumber);
          }
        }
        // Check CustomerInvoice records
        const customerInvoice = await CustomerInvoice.findOne({ invoiceNumber });
        if (customerInvoice && customerInvoice.status === 'paid') {
          if (!paidInvoices.includes(invoiceNumber)) {
            paidInvoices.push(invoiceNumber);
          }
        }
      }

      if (paidInvoices.length > 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: `The following invoice(s) are already fully paid and cannot receive additional payments: ${paidInvoices.join(', ')}` 
          },
          { status: 400 }
        );
      }
    }

    // Create payment record
    // Generate payment ID
    const count = await CustomerPayment.countDocuments();
    const paymentId = `CPAY-${String(count + 1).padStart(6, '0')}`;
    
    const payment = new CustomerPayment({
      paymentId,
      customer: customerId,
      customerName: customer.name,
      amount,
      paymentDate: paymentDate || new Date(),
      paymentMethod: paymentMethod || 'cash',
      referenceNumber,
      invoiceNumbers: invoiceNumbers || [],
      status: paymentStatus || 'pending',
      notes,
      recordedBy: user.userId,
    });

    await payment.save();

    // Update customer creditBalance only if payment method is 'credit'
    if (paymentMethod === 'credit') {
      // Validate that customer has sufficient credit balance
      if (customer.creditBalance < amount) {
        // If credit balance is less than payment amount, only deduct up to the available balance
        const creditToUse = Math.min(customer.creditBalance, amount);
        await Customer.findByIdAndUpdate(customerId, {
          $inc: { creditBalance: -creditToUse }
        });
      } else {
        await Customer.findByIdAndUpdate(customerId, {
          $inc: { creditBalance: -amount }
        });
      }
    }

    // If invoices are specified and payment is completed/paid, update their payment status
    if (invoiceNumbers && invoiceNumbers.length > 0 && (paymentStatus === 'completed' || paymentStatus === 'paid')) {
      const Sale = (await import('@/models/Sale')).default;
      
      for (const invoiceNumber of invoiceNumbers) {
        // Update Sale invoices
        const sale = await Sale.findOne({ invoiceNumber });
        if (sale) {
          const newAmountPaid = sale.amountPaid + amount;
          // Only mark as paid if total paid meets or exceeds the invoice total
          const newStatus = newAmountPaid >= sale.total ? 'paid' : 'partial';
          
          await Sale.findByIdAndUpdate(sale._id, {
            amountPaid: newAmountPaid,
            paymentStatus: newStatus,
          });
        }
        
        // Update CustomerInvoice records
        const customerInvoice = await CustomerInvoice.findOne({ invoiceNumber });
        if (customerInvoice) {
          const newAmountPaid = customerInvoice.amountPaid + amount;
          const newBalanceDue = Math.max(0, customerInvoice.total - newAmountPaid);
          
          // Only update to PAID if total paid amount meets or exceeds invoice total
          let newStatus: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled' = customerInvoice.status;
          if (newBalanceDue <= 0 && newAmountPaid >= customerInvoice.total) {
            newStatus = 'paid';
          } else if (newAmountPaid > 0) {
            newStatus = 'partial';
          }
          
          // Add payment record to invoice
          await CustomerInvoice.findByIdAndUpdate(customerInvoice._id, {
            $push: {
              payments: {
                amount,
                date: paymentDate || new Date(),
                method: (paymentMethod || 'cash') as 'cash' | 'mpesa' | 'bank' | 'cheque' | 'other',
                reference: referenceNumber,
                notes,
                recordedBy: new mongoose.Types.ObjectId(user.userId),
              },
            },
            $set: {
              amountPaid: newAmountPaid,
              balanceDue: newBalanceDue,
              status: newStatus,
            },
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