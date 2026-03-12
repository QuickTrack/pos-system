import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import User from '@/models/User';
import ActivityLog from '@/models/ActivityLog';
import { getAuthUser } from '@/lib/auth';

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
    const { newPassword, currentPassword } = await request.json();
    
    await dbConnect();
    
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // If changing own password, verify current password
    if (id === authUser.userId) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password required' }, { status: 400 });
      }
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }
    }
    
    // Only admin/super_admin can reset others' passwords without current password
    if (id !== authUser.userId && authUser.role !== 'admin' && authUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    user.password = newPassword || 'changeme123';
    await user.save();
    
    await ActivityLog.create({
      user: authUser.userId,
      userName: authUser.name,
      action: 'password_change',
      module: 'users',
      description: id === authUser.userId 
        ? 'User changed their own password' 
        : `Password reset for user: ${user.name}`,
      branch: authUser.branch,
    });
    
    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
