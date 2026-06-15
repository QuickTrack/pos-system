import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Quotation from '@/models/Quotation';
import { getAuthUser } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';

function generateQuotationNumber(sequence: number): string {
  return `QT-${String(sequence).padStart(4, '0')}`;
}

async function getNextQuotationNumber(): Promise<string> {
  const lastQuotation = await Quotation.findOne({
    quotationNumber: { $regex: /^QT-\d{4}$/ },
  }).sort({ quotationNumber: -1 });

  let sequence = 1;
  if (lastQuotation?.quotationNumber) {
    const parts = lastQuotation.quotationNumber.split('-');
    if (parts.length === 2) {
      const num = parseInt(parts[1], 10);
      if (!isNaN(num)) {
        sequence = num + 1;
      }
    }
  }

  return generateQuotationNumber(sequence);
}

async function resolveCustomer(customerId?: string) {
  if (!customerId) return null;

  const Customer = (await import('@/models/Customer')).default;
  const customer = await Customer.findById(customerId);

  if (!customer) {
    throw new Error('Customer not found');
  }

  return {
    id: customer._id.toString(),
    name: customer.name,
    phone: customer.phone,
    email: customer.email || '',
    businessName: customer.businessName || '',
    kraPin: customer.kraPin || '',
    address: customer.address || '',
  };
}

async function resolveBranch(requestedBranch?: string) {
  const Branch = (await import('@/models/Branch')).default;

  if (requestedBranch) {
    const branch = await Branch.findById(requestedBranch);
    if (branch) {
      return {
        id: branch._id.toString(),
        name: branch.name,
      };
    }
  }

  const branch = await Branch.findOne({ isActive: true }).sort({ isMain: -1 });
  if (!branch) {
    return null;
  }

  return {
    id: branch._id.toString(),
    name: branch.name,
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const customer = searchParams.get('customer');
    const status = searchParams.get('status');
    const salesperson = searchParams.get('salesperson');
    const branch = searchParams.get('branch');
    const category = searchParams.get('category');
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const query: any = {};

    if (startDate && endDate) {
      query.quoteDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (customer) {
      query.customer = customer;
    }

    if (status) {
      query.status = status;
    }

    if (salesperson) {
      query.salesperson = salesperson;
    }

    if (branch) {
      query.branch = branch;
    }

    if (search) {
      query.$or = [
        { quotationNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) {
      query['items.category'] = category;
    }

    if (user.role !== 'admin' && user.branch) {
      query.branch = user.branch;
    }

    const skip = (page - 1) * limit;

    const [quotations, total] = await Promise.all([
      Quotation.find(query)
        .populate('customer', 'name phone')
        .populate('salesperson', 'name')
        .populate('branch', 'name')
        .sort({ quoteDate: -1 })
        .skip(skip)
        .limit(limit),
      Quotation.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      quotations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get quotations error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch quotations', details: errorMessage },
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

    if (!hasPermission(user.role as any, 'manage_sales')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const data = await request.json();
    const items = Array.isArray(data.items) ? data.items : [];

    if (items.length === 0) {
      return NextResponse.json({ error: 'Add at least one item before saving the quotation.' }, { status: 400 });
    }

    const customerId = typeof data.customer === 'string' && data.customer ? data.customer : undefined;
    const customer = await resolveCustomer(customerId);

    if (customerId && !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 400 });
    }

    if (!customer && (!data.customerName || !data.customerPhone)) {
      return NextResponse.json({ error: 'Select a customer before saving the quotation.' }, { status: 400 });
    }

    const branch = await resolveBranch(typeof data.branch === 'string' && data.branch ? data.branch : undefined);
    if (!branch) {
      return NextResponse.json({ error: 'No active branch configured.' }, { status: 400 });
    }

    const status = data.status === 'sent' ? 'sent' : 'draft';
    const quotationNumber = (typeof data.quotationNumber === 'string' && data.quotationNumber.trim())
      ? data.quotationNumber.trim()
      : await getNextQuotationNumber();

    const quotation = await Quotation.create({
      ...data,
      quotationNumber,
      customer: customer?.id || customerId,
      customerName: customer?.name || data.customerName,
      customerPhone: customer?.phone || data.customerPhone,
      customerEmail: customer?.email || data.customerEmail || undefined,
      companyName: customer?.businessName || data.companyName || undefined,
      kraPin: customer?.kraPin || data.kraPin || undefined,
      deliveryAddress: customer?.address || data.deliveryAddress || undefined,
      salesperson: user.userId,
      salespersonName: user.name || user.email,
      branch: branch.id,
      branchName: branch.name,
      status,
      sentAt: status === 'sent' ? new Date() : undefined,
      createdBy: user.userId,
      items,
      shippingCharges: data.shippingCharges || 0,
      additionalCharges: data.additionalCharges || 0,
      subtotal: data.subtotal || 0,
      discountTotal: data.discountTotal || 0,
      vatTotal: data.vatTotal || 0,
      grandTotal: data.grandTotal || 0,
      taxRate: data.taxRate || 16,
      taxInclusive: Boolean(data.taxInclusive),
    });

    return NextResponse.json({
      success: true,
      quotation,
    }, { status: 201 });
  } catch (error) {
    console.error('Create quotation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage === 'Customer not found' ? 'Customer not found' : 'Failed to create quotation' },
      { status: 500 }
    );
  }
}
