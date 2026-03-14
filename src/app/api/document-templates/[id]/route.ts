import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import DocumentTemplate from '@/models/DocumentTemplate';
import { getAuthUser } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await dbConnect();
    
    const template = await DocumentTemplate.findById(id);
    
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, template });
  } catch (error) {
    console.error('Get template error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!hasPermission(user.role as any, 'manage_settings')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    await dbConnect();
    
    const existing = await DocumentTemplate.findById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    
    if (existing.isBuiltIn) {
      return NextResponse.json({ error: 'Cannot modify built-in templates' }, { status: 403 });
    }
    
    const data = await request.json();
    
    // If setting as default, unset other defaults for this category
    if (data.isDefault) {
      await DocumentTemplate.updateMany(
        { category: data.category, _id: { $ne: id } },
        { isDefault: false }
      );
    }
    
    const template = await DocumentTemplate.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true }
    );
    
    return NextResponse.json({ success: true, template });
  } catch (error) {
    console.error('Update template error:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!hasPermission(user.role as any, 'manage_settings')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    await dbConnect();
    
    const existing = await DocumentTemplate.findById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    
    if (existing.isBuiltIn) {
      return NextResponse.json({ error: 'Cannot delete built-in templates' }, { status: 403 });
    }
    
    await DocumentTemplate.findByIdAndDelete(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete template error:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
