import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import { Register, Shift, User, ActivityLog } from '@/models';
import { getAuthUser } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const branch = searchParams.get('branch');
    const isOpen = searchParams.get('isOpen');

    const query: any = {};
    if (branch) query.branch = branch;
    if (isOpen !== null && isOpen !== undefined) query.isOpen = isOpen === 'true';

    if (user.role !== 'admin' && user.branch) {
      query.branch = user.branch;
    }

    const registers = await Register.find(query)
      .populate('currentShift')
      .sort({ registerNumber: 1 })
      .lean();

    return NextResponse.json({ success: true, registers });
  } catch (error) {
    console.error('Get registers error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch registers', details: errorMessage }, { status: 500 });
  }
}

export async function OPTIONS(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const Branch = (await import('@/models/Branch')).default;
    
    const branches = await Branch.find({ isActive: true })
      .sort({ isMain: -1, name: 1 })
      .lean();

    return NextResponse.json({ success: true, branches });
  } catch (error) {
    console.error('Get branches for register error:', error);
    return NextResponse.json({ error: 'Failed to fetch branches' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role as any, 'manage_settings')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const data = await request.json();

    const { registerNumber, name, branch } = data;

    if (!registerNumber || !name || !branch) {
      return NextResponse.json({ error: 'Register number, name, and branch are required' }, { status: 400 });
    }

    const existing = await Register.findOne({ registerNumber });
    if (existing) {
      return NextResponse.json({ error: 'Register number already exists' }, { status: 409 });
    }

    const register = await Register.create({
      registerNumber,
      name,
      branch,
      status: 'active',
      isOpen: false,
    });

    await ActivityLog.create({
      user: user.userId as any,
      userName: user.name,
      action: 'create_register',
      module: 'system',
      description: `Created register ${registerNumber} - ${name}`,
      branch,
    });

    return NextResponse.json({ success: true, register }, { status: 201 });
  } catch (error) {
    console.error('Create register error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to create register', details: errorMessage }, { status: 500 });
  }
}
