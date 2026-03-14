import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import { getAuthUser } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';
import Printer from '@/models/Printer';

// GET /api/printers - List all printers
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const branch = searchParams.get('branch');
    const isActive = searchParams.get('isActive');

    const query: any = {};
    
    if (branch) {
      query.branch = branch;
    }
    
    if (isActive !== null) {
      query.isActive = isActive === 'true';
    }

    // Non-admin users can only see their branch's printers or global printers
    if (user.role !== 'admin') {
      query.$or = [
        { branch: user.branch },
        { branch: null }
      ];
    }

    const printers = await Printer.find(query)
      .populate('branch', 'name')
      .populate('createdBy', 'name')
      .sort({ isDefault: -1, name: 1 });

    return NextResponse.json({ success: true, printers });
  } catch (error) {
    console.error('Get printers error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch printers' },
      { status: 500 }
    );
  }
}

// POST /api/printers - Create new printer
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    if (!hasPermission(user.role as any, 'manage_settings')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.connection || !data.connection.type) {
      return NextResponse.json(
        { error: 'Missing required fields: name and connection type' },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await Printer.updateMany(
        { branch: user.branch || data.branch },
        { isDefault: false }
      );
    }

    // Create printer
    const printer = await Printer.create({
      ...data,
      createdBy: user.userId,
      branch: user.branch || data.branch
    });

    return NextResponse.json({ success: true, printer }, { status: 201 });
  } catch (error) {
    console.error('Create printer error:', error);
    return NextResponse.json(
      { error: 'Failed to create printer' },
      { status: 500 }
    );
  }
}

// PUT /api/printers - Bulk update printers
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role as any, 'manage_settings')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const { ids, action, data } = await request.json();

    if (!ids || !Array.isArray(ids) || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: ids and action' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'activate':
        result = await Printer.updateMany(
          { _id: { $in: ids } },
          { isActive: true }
        );
        break;

      case 'deactivate':
        result = await Printer.updateMany(
          { _id: { $in: ids } },
          { isActive: false }
        );
        break;

      case 'delete':
        result = await Printer.deleteMany({ _id: { $in: ids } });
        break;

      case 'setDefault':
        // Unset all defaults first
        await Printer.updateMany(
          { branch: user.branch },
          { isDefault: false }
        );
        // Set new default
        result = await Printer.updateMany(
          { _id: { $in: ids } },
          { isDefault: true }
        );
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Update printers error:', error);
    return NextResponse.json(
      { error: 'Failed to update printers' },
      { status: 500 }
    );
  }
}

// DELETE /api/printers - Delete printers
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role as any, 'manage_settings')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids')?.split(',') || [];

    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'No printer IDs provided' },
        { status: 400 }
      );
    }

    const result = await Printer.deleteMany({ _id: { $in: ids } });

    return NextResponse.json({ success: true, deleted: result.deletedCount });
  } catch (error) {
    console.error('Delete printers error:', error);
    return NextResponse.json(
      { error: 'Failed to delete printers' },
      { status: 500 }
    );
  }
}
