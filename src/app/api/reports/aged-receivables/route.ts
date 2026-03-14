import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import CustomerInvoice from '@/models/CustomerInvoice';
import Customer from '@/models/Customer';
import { getAuthUser } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer');
    
    const query: any = {
      status: { $in: ['sent', 'partial'] },
      balanceDue: { $gt: 0 },
    };
    
    if (customerId) {
      query.customer = customerId;
    }
    
    if (user.role !== 'admin' && user.branch) {
      query.branch = user.branch;
    }
    
    // Get all outstanding invoices
    const invoices = await CustomerInvoice.find(query)
      .populate('customer', 'name phone creditLimit')
      .sort({ dueDate: 1 });
    
    // Calculate aged receivables
    const today = new Date();
    const agedReceivables: Record<string, any> = {};
    
    for (const invoice of invoices) {
      const customerId = invoice.customer._id.toString();
      
      if (!agedReceivables[customerId]) {
        agedReceivables[customerId] = {
          customer: invoice.customer,
          totalDue: 0,
          current: 0,
          days30: 0,
          days60: 0,
          days90: 0,
          over90: 0,
          invoices: [],
        };
      }
      
      // Calculate days overdue
      const dueDate = new Date(invoice.dueDate);
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate amount based on age
      let amount = invoice.balanceDue;
      if (daysOverdue <= 0) {
        // Not yet due - count as current
        agedReceivables[customerId].current += amount;
      } else if (daysOverdue <= 30) {
        agedReceivables[customerId].days30 += amount;
      } else if (daysOverdue <= 60) {
        agedReceivables[customerId].days60 += amount;
      } else if (daysOverdue <= 90) {
        agedReceivables[customerId].days90 += amount;
      } else {
        agedReceivables[customerId].over90 += amount;
      }
      
      agedReceivables[customerId].totalDue += amount;
      agedReceivables[customerId].invoices.push({
        invoiceNumber: invoice.invoiceNumber,
        date: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        total: invoice.total,
        amountPaid: invoice.amountPaid,
        balanceDue: invoice.balanceDue,
        daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
        status: invoice.status,
      });
    }
    
    // Calculate totals
    const report = Object.values(agedReceivables);
    const totals = {
      totalDue: 0,
      current: 0,
      days30: 0,
      days60: 0,
      days90: 0,
      over90: 0,
    };
    
    for (const item of report) {
      totals.totalDue += item.totalDue;
      totals.current += item.current;
      totals.days30 += item.days30;
      totals.days60 += item.days60;
      totals.days90 += item.days90;
      totals.over90 += item.over90;
    }
    
    return NextResponse.json({
      success: true,
      report,
      totals,
    });
  } catch (error) {
    console.error('Get aged receivables error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch aged receivables report' },
      { status: 500 }
    );
  }
}
