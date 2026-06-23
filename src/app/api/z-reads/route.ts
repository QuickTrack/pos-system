import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import { ZRead, Shift, Sale, CashDrop, Expense, User, Branch, ActivityLog, Variance } from '@/models';
import { getAuthUser } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';
import { generateZReadId, generateVarianceId } from '@/lib/reconciliation-utils';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const shift = searchParams.get('shift');
    const branch = searchParams.get('branch');
    const cashier = searchParams.get('cashier');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const query: any = {};

    if (shift) query.shift = shift;
    if (branch) query.branch = branch;
    if (cashier) query.cashier = cashier;

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (user.role !== 'admin' && user.branch) {
      query.branch = user.branch;
    }

    const skip = (page - 1) * limit;

    const [reads, total] = await Promise.all([
      ZRead.find(query)
        .populate('shift', 'shiftId startTime endTime openingFloat')
        .populate('cashier', 'name')
        .populate('branch', 'name code')
        .populate('register', 'name registerNumber')
        .populate('generatedBy', 'name')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ZRead.countDocuments(query),
    ]);

    return NextResponse.json({ success: true, reads, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Get z-reads error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch z-reads', details: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role as any, 'manage_reconciliation')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const { shiftId } = await request.json();

    if (!shiftId) {
      return NextResponse.json({ error: 'Shift ID is required' }, { status: 400 });
    }

    const shift = await Shift.findById(shiftId);
    if (!shift || shift.status !== 'closed') {
      return NextResponse.json({ error: 'Shift must be closed to generate Z-Read' }, { status: 400 });
    }

    const shiftStart = new Date(shift.startTime);
    const shiftEnd = shift.endTime ? new Date(shift.endTime) : new Date();

    const salesQuery: any = {
      saleDate: { $gte: shiftStart, $lte: shiftEnd },
      status: { $in: ['completed', 'pending', 'refunded'] },
      branch: shift.branch,
    };

    const sales = await Sale.find(salesQuery).lean();

    let grossSales = 0;
    let discounts = 0;
    let returns = 0;
    let netSales = 0;
    let totalTransactions = 0;
    let refunds = 0;
    let voids = 0;
    let cashTotal = 0;
    let mpesaTotal = 0;
    let cardTotal = 0;
    let bankTotal = 0;
    let creditTotal = 0;
    let mixedTotal = 0;
    let taxableSalesAmount = 0;
    let vatAmount = 0;

    for (const sale of sales) {
      if (sale.isRefund) {
        refunds++;
        returns += sale.total;
        continue;
      }
      if (sale.status === 'voided') {
        voids++;
        continue;
      }

      totalTransactions++;
      const itemTotal = sale.total;

      if (sale.paymentMethod === 'cash') {
        cashTotal += itemTotal;
      } else if (sale.paymentMethod === 'mpesa') {
        mpesaTotal += itemTotal;
      } else if (sale.paymentMethod === 'card') {
        cardTotal += itemTotal;
      } else if (sale.paymentMethod === 'mixed') {
        mixedTotal += itemTotal;
        const cashPart = sale.paymentDetails?.filter((p: any) => p.method === 'cash').reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
        const mpesaPart = sale.paymentDetails?.filter((p: any) => p.method === 'mpesa').reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
        const cardPart = sale.paymentDetails?.filter((p: any) => p.method === 'card').reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
        const bankPart = sale.paymentDetails?.filter((p: any) => p.method === 'bank_transfer').reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
        cashTotal += cashPart;
        mpesaTotal += mpesaPart;
        cardTotal += cardPart;
        bankTotal += bankPart;
      } else if (sale.paymentMethod === 'account' || sale.paymentMethod === 'credit') {
        creditTotal += itemTotal;
      } else if (sale.paymentMethod === 'bank_transfer') {
        bankTotal += itemTotal;
      }

      discounts += sale.discountAmount || 0;

      if (sale.taxRate && !sale.isRefund) {
        vatAmount += sale.tax || 0;
        const baseAmount = sale.total / (1 + (sale.taxRate || 16) / 100);
        taxableSalesAmount += baseAmount;
      }
    }

    grossSales = cashTotal + mpesaTotal + cardTotal + bankTotal + creditTotal + mixedTotal + returns;
    netSales = grossSales - discounts;

    const cashDropsTotal = await CashDrop.aggregate([
      { $match: { shift: (shift as any)._id } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).then(r => r[0]?.total || 0);

    const expensesTotal = await Expense.aggregate([
      {
        $match: {
          branch: shift.branch,
          dateTime: { $gte: shiftStart, $lte: shiftEnd },
          status: { $in: ['approved', 'pending'] },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).then(r => r[0]?.total || 0);

    const cashReceived = cashTotal;
    const expectedCash = shift.openingFloat + cashReceived - cashDropsTotal - expensesTotal;
    const actualCash = shift.actualCash || 0;
    const variance = actualCash - expectedCash;

    const cashSummary = {
      openingFloat: shift.openingFloat,
      cashReceived,
      cashDrops: cashDropsTotal,
      expenses: expensesTotal,
      expectedCash,
      actualCash,
      variance,
    };

    const readId = await generateZReadId();

    const userDoc = await User.findById(user.userId).lean();
    const branchDoc = await Branch.findById(shift.branch).lean();

    const zRead = await ZRead.create({
      readId,
      shift: (shift as any)._id,
      date: shiftEnd,
      branch: shift.branch,
      cashier: shift.cashier,
      cashierName: shift.cashierName,
      register: shift.register,
      registerNumber: shift.registerNumber,
      salesBreakdown: {
        grossSales,
        discounts,
        returns,
        netSales,
        totalTransactions,
        refunds,
        voids,
      },
      paymentBreakdown: {
        cash: cashTotal,
        mpesa: mpesaTotal,
        card: cardTotal,
        bank: bankTotal,
        credit: creditTotal,
        mixed: mixedTotal,
      },
      taxSummary: {
        vatCollected: vatAmount,
        taxableSales: taxableSalesAmount,
        zeroRatedSales: grossSales - taxableSalesAmount,
        taxRate: 16,
      },
      cashSummary,
      generatedBy: user.userId,
      generatedByName: user.name,
    });

    const hasVariance = Math.abs(variance) > 0;
    if (hasVariance) {
      await Variance.create({
        varianceId: await generateVarianceId(),
        shift: (shift as any)._id,
        branch: shift.branch,
        registerNumber: shift.registerNumber,
        type: variance < 0 ? 'shortage' : 'overage',
        amount: Math.abs(variance),
        explanation: 'Auto-detected from Z-Read',
        approvedBy: user.userId,
        approvedByName: user.name,
        status: 'approved',
      });
    }

    await ActivityLog.create({
      user: user.userId as any,
      userName: user.name,
      action: 'generate_zread',
      module: 'system',
      description: `Generated Z-Read ${readId} for shift ${shift.shiftId}`,
      branch: shift.branch,
    });

    const populated = await ZRead.findById((zRead as any)._id)
      .populate('shift', 'shiftId startTime endTime')
      .populate('cashier', 'name')
      .populate('branch', 'name code')
      .populate('register', 'name registerNumber')
      .populate('generatedBy', 'name')
      .lean();

    return NextResponse.json({ success: true, zRead: populated }, { status: 201 });
  } catch (error) {
    console.error('Generate z-read error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to generate z-read', details: errorMessage }, { status: 500 });
  }
}
