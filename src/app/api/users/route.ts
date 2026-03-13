import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import User, { IPermission } from '@/models/User';
import ActivityLog from '@/models/ActivityLog';
import { getAuthUser } from '@/lib/auth-server';
import bcrypt from 'bcryptjs';

const DEFAULT_PERMISSIONS: Record<string, IPermission> = {
  super_admin: {
    sales: true, refunds: true, inventory: true, purchases: true, suppliers: true,
    reports: true, customers: true, discounts: true, settings: true, users: true, branches: true
  },
  admin: {
    sales: true, refunds: true, inventory: true, purchases: true, suppliers: true,
    reports: true, customers: true, discounts: true, settings: true, users: true, branches: true
  },
  manager: {
    sales: true, refunds: true, inventory: true, purchases: true, suppliers: true,
    reports: true, customers: true, discounts: true, settings: false, users: false, branches: false
  },
  cashier: {
    sales: true, refunds: false, inventory: false, purchases: false, suppliers: false,
    reports: false, customers: true, discounts: true, settings: false, users: false, branches: false
  },
  stock_manager: {
    sales: false, refunds: false, inventory: true, purchases: true, suppliers: true,
    reports: true, customers: false, discounts: false, settings: false, users: false, branches: false
  }
};

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role');
    const branch = searchParams.get('branch');
    const isActive = searchParams.get('isActive');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const query: any = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (role) query.role = role;
    if (branch) query.branch = branch;
    if (isActive !== null && isActive !== '') query.isActive = isActive === 'true';
    
    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      User.find(query)
        .populate('branch', 'name')
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ]);
    
    return NextResponse.json({
      success: true,
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (authUser.role !== 'admin' && authUser.role !== 'super_admin' && authUser.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    await dbConnect();
    
    const data = await request.json();
    
    const existing = await User.findOne({ 
      $or: [{ email: data.email }, { phone: data.phone }] 
    });
    if (existing) {
      return NextResponse.json(
        { error: 'User with this email or phone already exists' },
        { status: 400 }
      );
    }
    
    const userData: any = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: data.password || 'changeme123',
      role: data.role,
      branch: data.branch,
      profilePhoto: data.profilePhoto,
      isActive: true,
      permissions: data.customPermissions ? data.permissions : DEFAULT_PERMISSIONS[data.role],
      createdBy: authUser.userId,
    };
    
    if (data.pin) {
      userData.pin = await bcrypt.hash(data.pin, 10);
    }
    
    const user = await User.create(userData);
    
    await ActivityLog.create({
      user: authUser.userId,
      userName: authUser.name,
      action: 'user_create',
      module: 'users',
      description: `Created new user: ${user.name} (${user.role})`,
      branch: authUser.branch,
    });
    
    return NextResponse.json({
      success: true,
      user: { ...user.toObject(), password: undefined }
    }, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
