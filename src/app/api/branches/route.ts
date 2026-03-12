import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Branch from '@/models/Branch';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await dbConnect();
    
    const branches = await Branch.find({}).sort({ isMain: -1, name: 1 });
    
    return NextResponse.json({
      success: true,
      branches,
    });
  } catch (error) {
    console.error('Get branches error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch branches' },
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
    
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    await dbConnect();
    
    const data = await request.json();
    
    const existing = await Branch.findOne({ code: data.code });
    if (existing) {
      return NextResponse.json(
        { error: 'Branch code already exists' },
        { status: 400 }
      );
    }
    
    if (data.isMain) {
      await Branch.updateMany({}, { isMain: false });
    }
    
    const branch = await Branch.create(data);
    
    return NextResponse.json({
      success: true,
      branch,
    }, { status: 201 });
  } catch (error) {
    console.error('Create branch error:', error);
    return NextResponse.json(
      { error: 'Failed to create branch' },
      { status: 500 }
    );
  }
}
