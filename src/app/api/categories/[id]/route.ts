import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Category from '@/models/Category';
import Product from '@/models/Product';
import { getAuthUser } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    
    const category = await Category.findById(id)
      .populate('parentCategory', 'name');
    
    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }
    
    // Get child categories
    const children = await Category.find({ parentCategory: id })
      .sort({ name: 1 });
    
    // Get product count
    const productCount = await Product.countDocuments({ category: id });
    
    return NextResponse.json({
      success: true,
      category,
      children,
      productCount,
    });
  } catch (error) {
    console.error('Get category error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!hasPermission(user.role as any, 'manage_categories')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const { id } = await params;
    await dbConnect();
    
    const data = await request.json();
    
    // If changing parent, recalculate level and path
    if (data.parentCategory !== undefined) {
      if (data.parentCategory) {
        const parent = await Category.findById(data.parentCategory);
        if (parent) {
          data.level = (parent.level || 0) + 1;
          data.path = parent.path ? `${parent.path}/${parent._id}` : `${parent._id}`;
          data.parentName = parent.name;
        }
      } else {
        data.level = 0;
        data.path = '';
        data.parentName = null;
      }
    }
    
    const category = await Category.findByIdAndUpdate(
      id,
      data,
      { new: true, runValidators: true }
    );
    
    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      category,
    });
  } catch (error) {
    console.error('Update category error:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!hasPermission(user.role as any, 'manage_categories')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const { id } = await params;
    await dbConnect();
    
    // Check if category has children
    const childCount = await Category.countDocuments({ parentCategory: id });
    if (childCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with subcategories. Remove subcategories first.' },
        { status: 400 }
      );
    }
    
    // Check if category has products
    const productCount = await Product.countDocuments({ category: id });
    if (productCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete category with ${productCount} products. Reassign products first.` },
        { status: 400 }
      );
    }
    
    const category = await Category.findByIdAndDelete(id);
    
    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    console.error('Delete category error:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}
