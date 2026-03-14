import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Category from '@/models/Category';
import { getAuthUser } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const parent = searchParams.get('parent');
    const active = searchParams.get('active');
    const hierarchical = searchParams.get('hierarchical');
    
    const query: any = {};
    
    if (parent === 'true') {
      query.parentCategory = { $exists: false };
    } else if (parent) {
      query.parentCategory = parent;
    }
    
    if (active !== 'false') {
      query.isActive = true;
    }
    
    const categories = await Category.find(query)
      .populate('parentCategory', 'name')
      .sort({ level: 1, sortOrder: 1, name: 1 });
    
    // If hierarchical is requested, build tree structure
    if (hierarchical === 'true') {
      const buildTree = (cats: any[], parentId: any = null): any[] => {
        return cats
          .filter(c => {
            if (parentId === null) return !c.parentCategory;
            return c.parentCategory && c.parentCategory._id?.toString() === parentId?.toString();
          })
          .map(c => ({
            ...c.toObject(),
            children: buildTree(cats, c._id)
          }));
      };
      
      const tree = buildTree(categories);
      return NextResponse.json({
        success: true,
        categories: tree,
      });
    }
    
    return NextResponse.json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
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
    
    if (!hasPermission(user.role as any, 'manage_categories')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    await dbConnect();
    
    const data = await request.json();
    
    // Generate code if not provided
    if (!data.code) {
      data.code = data.name.substring(0, 3).toUpperCase() + Date.now();
    }
    
    // Calculate level and path based on parent
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
    }
    
    const category = await Category.create(data);
    
    return NextResponse.json({
      success: true,
      category,
    }, { status: 201 });
  } catch (error) {
    console.error('Create category error:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
