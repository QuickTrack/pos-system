import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Expense from '@/models/Expense';
import ExpenseCategory from '@/models/ExpenseCategory';
import Branch from '@/models/Branch';
import { getAuthUser } from '@/lib/auth-server';
import mongoose from 'mongoose';

function serializeObjectId(value: any): string {
  if (!value) return '';
  if (typeof value.toString === 'function') return value.toString();
  return String(value);
}

function serializePopulated(value: any) {
  if (!value) return null;

  const object = typeof value.toObject === 'function' ? value.toObject() : value;
  const id = object?._id || value?._id;

  return {
    ...object,
    _id: serializeObjectId(id),
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const branch = searchParams.get('branch');
    const paymentSource = searchParams.get('paymentSource');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    const query: any = {};

    if (user.role !== 'admin' && user.branch) {
      query.branch = user.branch;
    }

    if (branch && user.role === 'admin') {
      query.branch = branch;
    }

    if (search) {
      query.$or = [
        { transactionNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { payeeName: { $regex: search, $options: 'i' } },
        { expenseCategoryName: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) {
      const statuses = status.split(',').map((s) => s.trim());
      if (statuses.length === 1) {
        query.status = statuses[0];
      } else {
        query.status = { $in: statuses };
      }
    }

    if (category) {
      query.expenseCategory = category;
    }

    if (paymentSource) {
      query.paymentSource = paymentSource;
    }

    if (startDate || endDate) {
      query.dateTime = {};
      if (startDate) query.dateTime.$gte = new Date(startDate);
      if (endDate) query.dateTime.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [expenses, total] = await Promise.all([
      Expense.find(query)
        .populate('branch', 'name code')
        .populate('expenseCategory', 'name')
        .sort({ dateTime: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Expense.countDocuments(query),
    ]);

    const serialized = expenses.map((e: any) => ({
      ...e,
      _id: serializeObjectId(e._id),
      branch: serializePopulated(e.branch),
      expenseCategory: serializePopulated(e.expenseCategory),
      createdBy: serializePopulated(e.createdBy),
      approvedBy: serializePopulated(e.approvedBy),
      rejectedBy: serializePopulated(e.rejectedBy),
    }));

    return NextResponse.json({
      success: true,
      expenses: serialized,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const {
      dateTime,
      branch,
      department,
      expenseCategory,
      expenseSubcategory,
      description,
      amount,
      paymentSource,
      paymentSourceDetail,
      bankAccountId,
      bankAccountName,
      payeeType,
      payeeName,
      payeePhoneNumber,
      payeeReferenceNumber,
      payeeSupplierId,
      payeeEmployeeId,
      attachments,
      notes,
    } = body;

    if (!branch || !expenseCategory || !description || !amount || !paymentSource || !payeeType || !payeeName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: branch, expenseCategory, description, amount, paymentSource, payeeType, payeeName' },
        { status: 400 }
      );
    }

    const category = await ExpenseCategory.findById(expenseCategory);
    if (!category) {
      return NextResponse.json({ success: false, error: 'Invalid expense category' }, { status: 400 });
    }

    let branchName = '';

    if (branch) {
      const branchDoc = await Branch.findById(branch);
      if (!branchDoc) {
        return NextResponse.json({ success: false, error: 'Invalid branch' }, { status: 400 });
      }
      branchName = branchDoc.name;
    }

    let expenseBranch = user.role !== 'admin' ? user.branch : branch;
    if (!expenseBranch) {
      const branches = await mongoose.model('Branch').find({}).limit(1);
      if (branches.length > 0) {
        expenseBranch = branches[0]._id;
        if (!branchName && branches.length > 0) {
          branchName = (branches[0] as any).name;
        }
      }
    }
    if (!expenseBranch) {
      return NextResponse.json({ success: false, error: 'Branch is required' }, { status: 400 });
    }

    const count = await Expense.countDocuments();
    const year = new Date().getFullYear();
    const transactionNumber = `PAY-${year}-${String(count + 1).padStart(5, '0')}`;

    const expense = new Expense({
      transactionNumber,
      dateTime: dateTime ? new Date(dateTime) : new Date(),
      branch: expenseBranch,
      branchName,
      department: department || '',
      expenseCategory,
      expenseCategoryName: category.name,
      expenseSubcategory: expenseSubcategory || '',
      description,
      amount: Number(amount),
      paymentSource,
      paymentSourceDetail: paymentSourceDetail || '',
      bankAccountId: bankAccountId || undefined,
      bankAccountName: bankAccountName || '',
      payeeType,
      payeeName,
      payeePhoneNumber: payeePhoneNumber || '',
      payeeReferenceNumber: payeeReferenceNumber || '',
      payeeSupplierId: payeeSupplierId || undefined,
      payeeEmployeeId: payeeEmployeeId || undefined,
      attachments: attachments || [],
      notes: notes || '',
      status: 'pending',
      createdBy: user.userId,
      createdByName: user.name,
    });

    await expense.save();

    const populated = await Expense.findById(expense._id)
      .populate('branch', 'name code')
      .populate('expenseCategory', 'name')
      .lean();

    const serialized = serializePopulated(populated);

    return NextResponse.json({ success: true, expense: serialized }, { status: 201 });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create expense' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'manager', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const body = await request.json();
    const { id, action } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Expense ID is required' }, { status: 400 });
    }

    const expense = await Expense.findById(id);
    if (!expense) {
      return NextResponse.json({ success: false, error: 'Expense not found' }, { status: 404 });
    }

    if (action === 'approve') {
      if (expense.status !== 'pending') {
        return NextResponse.json(
          { success: false, error: 'Only pending expenses can be approved' },
          { status: 400 }
        );
      }
      expense.status = 'approved';
      expense.approvedBy = new mongoose.Types.ObjectId(user.userId);
      expense.approvedByName = user.name;
      expense.approvedAt = new Date();
    } else if (action === 'reject') {
      if (expense.status !== 'pending') {
        return NextResponse.json(
          { success: false, error: 'Only pending expenses can be rejected' },
          { status: 400 }
        );
      }
      const { rejectionReason } = body;
      if (!rejectionReason || !rejectionReason.trim()) {
        return NextResponse.json(
          { success: false, error: 'Rejection reason is required' },
          { status: 400 }
        );
      }
      expense.status = 'rejected';
      expense.rejectedBy = new mongoose.Types.ObjectId(user.userId);
      expense.rejectedByName = user.name;
      expense.rejectedAt = new Date();
      expense.rejectionReason = rejectionReason.trim();
    } else {
      const updateFields: any = {};
      if (body.dateTime) updateFields.dateTime = new Date(body.dateTime);
      if (body.department !== undefined) updateFields.department = body.department;
      if (body.expenseCategory) updateFields.expenseCategory = body.expenseCategory;
      if (body.expenseSubcategory !== undefined) updateFields.expenseSubcategory = body.expenseSubcategory;
      if (body.description) updateFields.description = body.description;
      if (body.amount !== undefined) updateFields.amount = Number(body.amount);
      if (body.paymentSource) updateFields.paymentSource = body.paymentSource;
      if (body.paymentSourceDetail !== undefined) updateFields.paymentSourceDetail = body.paymentSourceDetail;
      if (body.bankAccountId !== undefined) updateFields.bankAccountId = body.bankAccountId;
      if (body.bankAccountName !== undefined) updateFields.bankAccountName = body.bankAccountName;
      if (body.payeeType) updateFields.payeeType = body.payeeType;
      if (body.payeeName) updateFields.payeeName = body.payeeName;
      if (body.payeePhoneNumber !== undefined) updateFields.payeePhoneNumber = body.payeePhoneNumber;
      if (body.payeeReferenceNumber !== undefined) updateFields.payeeReferenceNumber = body.payeeReferenceNumber;
      if (body.notes !== undefined) updateFields.notes = body.notes;
      if (body.attachments) updateFields.attachments = body.attachments;

      if (expense.status === 'pending') {
        Object.assign(expense, updateFields);
      }
    }

    await expense.save();

    const populated = await Expense.findById(expense._id)
      .populate('branch', 'name code')
      .populate('expenseCategory', 'name')
      .lean();

    const serialized = serializePopulated(populated);

    return NextResponse.json({ success: true, expense: serialized });
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update expense' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Expense ID is required' }, { status: 400 });
    }

    const expense = await Expense.findById(id);
    if (!expense) {
      return NextResponse.json({ success: false, error: 'Expense not found' }, { status: 404 });
    }

    if (expense.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Only pending expenses can be deleted' },
        { status: 400 }
      );
    }

    await Expense.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete expense' },
      { status: 500 }
    );
  }
}
