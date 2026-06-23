import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import ExpenseCategory from '@/models/ExpenseCategory';
import { getAuthUser } from '@/lib/auth-server';

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const isActive = searchParams.get('isActive');
    const includeInactive = searchParams.get('includeInactive');

    const query: any = {};

    if (!includeInactive || includeInactive !== 'true') {
      query.isActive = isActive !== 'false';
    } else if (isActive === 'true') {
      query.isActive = true;
    } else if (isActive === 'false') {
      query.isActive = false;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const categories = await ExpenseCategory.find(query)
      .populate('branch', 'name code')
      .populate('parentCategory', 'name')
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    const serialized = categories.map((c: any) => {
      const categoryObject = typeof c.toObject === 'function' ? c.toObject() : c;

      return {
        ...categoryObject,
        _id: serializeObjectId(categoryObject._id),
        branch: serializePopulated(c.branch),
        parentCategory: serializePopulated(c.parentCategory),
      };
    });

    return NextResponse.json({
      success: true,
      categories: serialized,
    });
  } catch (error) {
    console.error('Error fetching expense categories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch expense categories' },
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

    if (!['admin', 'manager', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const body = await request.json();
    const { name, description, parentCategory, isActive, sortOrder } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Category name is required' }, { status: 400 });
    }

    let parentName = '';
    let level = 0;
    let path = name.trim();

    if (parentCategory) {
      const parent = await ExpenseCategory.findById(parentCategory);
      if (parent) {
        parentName = parent.name;
        level = parent.level + 1;
        path = parent.path ? `${parent.path} / ${name.trim()}` : `${parent.name} / ${name.trim()}`;
      }
    }

    const category = new ExpenseCategory({
      name: name.trim(),
      description: description || '',
      parentCategory: parentCategory || undefined,
      parentName: parentName || undefined,
      level,
      path,
      isActive: isActive !== false,
      sortOrder: sortOrder || 0,
    });

    await category.save();

    const populated = await ExpenseCategory.findById(category._id)
      .populate('branch', 'name code')
      .populate('parentCategory', 'name')
      .lean();

    const categoryObject = serializePopulated(populated) || {};
    const serialized = {
      ...categoryObject,
      branch: serializePopulated(populated?.branch),
      parentCategory: serializePopulated(populated?.parentCategory),
    };

    return NextResponse.json({ success: true, category: serialized }, { status: 201 });
  } catch (error) {
    console.error('Error creating expense category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create expense category' },
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

    if (!['admin', 'manager', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const body = await request.json();
    const { id, name, description, parentCategory, isActive, sortOrder } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Category ID is required' }, { status: 400 });
    }

    const category = await ExpenseCategory.findById(id);
    if (!category) {
      return NextResponse.json({ success: false, error: 'Expense category not found' }, { status: 404 });
    }

    const updateFields: any = {};
    if (name) updateFields.name = name.trim();
    if (description !== undefined) updateFields.description = description;
    if (sortOrder !== undefined) updateFields.sortOrder = sortOrder;
    if (isActive !== undefined) updateFields.isActive = isActive;

    if (parentCategory !== undefined) {
      if (parentCategory) {
        const parent = await ExpenseCategory.findById(parentCategory);
        if (parent) {
          updateFields.parentCategory = parentCategory;
          updateFields.parentName = parent.name;
          updateFields.level = parent.level + 1;
          updateFields.path = parent.path ? `${parent.path} / ${updateFields.name || category.name}` : `${parent.name} / ${updateFields.name || category.name}`;
        } else {
          updateFields.parentCategory = undefined;
          updateFields.parentName = '';
          updateFields.level = 0;
          updateFields.path = updateFields.name || category.name;
        }
      } else {
        updateFields.parentCategory = undefined;
        updateFields.parentName = '';
        updateFields.level = 0;
        updateFields.path = updateFields.name || category.name;
      }
    }

    Object.assign(category, updateFields);
    await category.save();

    const populated = await ExpenseCategory.findById(category._id)
      .populate('branch', 'name code')
      .populate('parentCategory', 'name')
      .lean();

    const categoryObject = serializePopulated(populated) || {};
    const serialized = {
      ...categoryObject,
      branch: serializePopulated(populated?.branch),
      parentCategory: serializePopulated(populated?.parentCategory),
    };

    return NextResponse.json({ success: true, category: serialized });
  } catch (error) {
    console.error('Error updating expense category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update expense category' },
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

    if (!['admin', 'manager', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Category ID is required' }, { status: 400 });
    }

    const category = await ExpenseCategory.findById(id);
    if (!category) {
      return NextResponse.json({ success: false, error: 'Expense category not found' }, { status: 404 });
    }

    await ExpenseCategory.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'Expense category deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete expense category' },
      { status: 500 }
    );
  }
}
