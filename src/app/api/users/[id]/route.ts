import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import User from '@/models/User';
import ActivityLog from '@/models/ActivityLog';
import { getAuthUser } from '@/lib/auth-server';
import bcrypt from 'bcryptjs';

const DEFAULT_PERMISSIONS: Record<string, any> = {
  super_admin: { sales: true, refunds: true, inventory: true, purchases: true, suppliers: true, reports: true, customers: true, discounts: true, settings: true, users: true, branches: true },
  admin: { sales: true, refunds: true, inventory: true, purchases: true, suppliers: true, reports: true, customers: true, discounts: true, settings: true, users: true, branches: true },
  manager: { sales: true, refunds: true, inventory: true, purchases: true, suppliers: true, reports: true, customers: true, discounts: true, settings: false, users: false, branches: false },
  cashier: { sales: true, refunds: false, inventory: false, purchases: false, suppliers: false, reports: false, customers: true, discounts: true, settings: false, users: false, branches: false },
  stock_manager: { sales: false, refunds: false, inventory: true, purchases: true, suppliers: true, reports: true, customers: false, discounts: false, settings: false, users: false, branches: false }
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    
    const user = await User.findById(id).populate('branch', 'name').select('-password');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = await params;
    await dbConnect();
    
    const data = await request.json();
    
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const updateData: any = {};
    
    if (data.name) updateData.name = data.name;
    if (data.email && data.email !== user.email) {
      const existing = await User.findOne({ email: data.email, _id: { $ne: id } });
      if (existing) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }
      updateData.email = data.email;
    }
    if (data.phone && data.phone !== user.phone) {
      const existing = await User.findOne({ phone: data.phone, _id: { $ne: id } });
      if (existing) {
        return NextResponse.json({ error: 'Phone already in use' }, { status: 400 });
      }
      updateData.phone = data.phone;
    }
    if (data.role) updateData.role = data.role;
    if (data.branch !== undefined) updateData.branch = data.branch;
    if (data.profilePhoto !== undefined) updateData.profilePhoto = data.profilePhoto;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    
    if (data.permissions) {
      updateData.permissions = data.permissions;
    } else if (data.role && data.role !== user.role) {
      updateData.permissions = DEFAULT_PERMISSIONS[data.role];
    }
    
    if (data.pin) {
      updateData.pin = await bcrypt.hash(data.pin, 10);
    }
    
    if (data.password) {
      updateData.password = data.password;
    }
    
    await User.findByIdAndUpdate(id, updateData);
    
    await ActivityLog.create({
      user: authUser.userId,
      userName: authUser.name,
      action: 'user_update',
      module: 'users',
      description: `Updated user: ${user.name}`,
      metadata: { updatedFields: Object.keys(updateData).filter(k => k !== 'password' && k !== 'pin') },
      branch: authUser.branch,
    });
    
    const updatedUser = await User.findById(id).populate('branch', 'name').select('-password');
    
    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (authUser.role !== 'admin' && authUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const { id } = await params;
    await dbConnect();
    
    if (id === authUser.userId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }
    
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    await User.findByIdAndDelete(id);
    
    await ActivityLog.create({
      user: authUser.userId,
      userName: authUser.name,
      action: 'user_delete',
      module: 'users',
      description: `Deleted user: ${user.name}`,
      branch: authUser.branch,
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
