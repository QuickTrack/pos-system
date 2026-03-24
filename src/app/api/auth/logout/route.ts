import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Session from '@/models/Session';
import ActivityLog from '@/models/ActivityLog';
import { getAuthUser } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    // Get current user for logging
    const authUser = await getAuthUser();
    
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value;
    
    if (token && authUser) {
      // Deactivate the session in the database
      await Session.updateMany(
        { user: authUser.userId, isActive: true },
        { isActive: false }
      );
      
      // Log the logout activity
      await ActivityLog.create({
        user: authUser.userId,
        userName: authUser.name,
        action: 'logout',
        module: 'users',
        description: 'User logged out',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent'),
      });
    }
    
    const response = NextResponse.json({ success: true });
    
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    // Still return success even if there's an error
    const response = NextResponse.json({ success: true });
    
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    
    return response;
  }
}
