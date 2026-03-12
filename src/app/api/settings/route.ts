import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Settings from '@/models/Settings';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    // Get auth user
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let settings = await Settings.findOne({});
    
    if (!settings) {
      // Create default settings
      settings = await Settings.create({});
    }

    return NextResponse.json({ settings: settings.toObject() });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    
    // Get auth user
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'manager', 'super_admin'].includes(authUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    
    // Find and update or create settings
    let settings = await Settings.findOne({});
    
    if (settings) {
      settings = await Settings.findByIdAndUpdate(
        settings._id,
        { $set: body },
        { new: true, runValidators: true }
      );
    } else {
      settings = await Settings.create(body);
    }

    if (!settings) {
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }

    return NextResponse.json({ settings: settings.toObject() });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
