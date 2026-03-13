import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import ActivityLog from '@/models/ActivityLog';
import { getAuthUser } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const moduleParam = searchParams.get('module');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const query: any = {};
    
    if (userId) query.user = userId;
    if (action) query.action = action;
    if (moduleParam) query.module = moduleParam;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    // Non-admins can only see their own logs
    if (authUser.role !== 'admin' && authUser.role !== 'super_admin') {
      query.user = authUser.userId;
    }
    
    const skip = (page - 1) * limit;
    
    const [logs, total] = await Promise.all([
      ActivityLog.find(query)
        .populate('user', 'name email')
        .populate('branch', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ActivityLog.countDocuments(query),
    ]);
    
    return NextResponse.json({
      success: true,
      logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get logs error:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await dbConnect();
    
    const data = await request.json();
    
    const log = await ActivityLog.create({
      user: authUser.userId,
      userName: authUser.name,
      action: data.action,
      module: data.module,
      description: data.description,
      metadata: data.metadata,
      branch: authUser.branch,
    });
    
    return NextResponse.json({ success: true, log }, { status: 201 });
  } catch (error) {
    console.error('Create log error:', error);
    return NextResponse.json({ error: 'Failed to create log' }, { status: 500 });
  }
}
