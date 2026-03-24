import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Session from '@/models/Session';
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
    const includeInactive = searchParams.get('includeInactive') === 'true';
    
    // Build query
    const query: any = {};
    
    // Non-admins can only see their own sessions
    if (authUser.role !== 'admin' && authUser.role !== 'super_admin') {
      query.user = authUser.userId;
    } else if (userId) {
      query.user = userId;
    }
    
    if (!includeInactive) {
      query.isActive = true;
    }
    
    const sessions = await Session.find(query)
      .populate('user', 'name email role')
      .sort({ lastActivity: -1 })
      .limit(50);
    
    // Get session count per user for admins
    let sessionStats = null;
    if (authUser.role === 'admin' || authUser.role === 'super_admin') {
      const activeSessionsCount = await Session.countDocuments({ isActive: true });
      const uniqueUsersCount = await Session.distinct('user', { isActive: true });
      sessionStats = {
        totalActive: activeSessionsCount,
        uniqueUsers: uniqueUsersCount.length,
      };
    }
    
    return NextResponse.json({
      success: true,
      sessions,
      sessionStats,
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

// Create a new session (called during login)
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const data = await request.json();
    const { userId, userName, userEmail, tokenId, ipAddress, userAgent, deviceInfo, expiresInDays = 7 } = data;
    
    if (!userId || !userName || !userEmail || !tokenId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Check concurrent session limit (default: 3 devices per user)
    const MAX_CONCURRENT_SESSIONS = parseInt(process.env.MAX_CONCURRENT_SESSIONS || '3');
    
    const existingActiveSessions = await Session.countDocuments({
      user: userId,
      isActive: true,
    });
    
    if (existingActiveSessions >= MAX_CONCURRENT_SESSIONS) {
      // Deactivate oldest session to make room
      const oldestSession = await Session.findOne({
        user: userId,
        isActive: true,
      }).sort({ createdAt: 1 });
      
      if (oldestSession) {
        oldestSession.isActive = false;
        await oldestSession.save();
      }
    }
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    
    const session = await Session.create({
      user: userId,
      userName,
      userEmail,
      tokenId,
      ipAddress,
      userAgent,
      deviceInfo,
      isActive: true,
      lastActivity: new Date(),
      expiresAt,
    });
    
    return NextResponse.json({ success: true, session }, { status: 201 });
  } catch (error) {
    console.error('Create session error:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

// Manage sessions (revoke, update)
export async function PATCH(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await dbConnect();
    
    const data = await request.json();
    const { sessionId, action, userId } = data;
    
    if (action === 'revoke') {
      // Revoke a specific session
      const session = await Session.findById(sessionId);
      
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      
      // Check permission - user can only revoke their own sessions unless admin
      const isOwnSession = session.user.toString() === authUser.userId;
      const isAdmin = authUser.role === 'admin' || authUser.role === 'super_admin';
      
      if (!isOwnSession && !isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      
      session.isActive = false;
      await session.save();
      
      return NextResponse.json({ success: true, message: 'Session revoked' });
    }
    
    if (action === 'revokeAll') {
      // Revoke all sessions for a user
      const targetUserId = userId || authUser.userId;
      
      // Non-admins can only revoke their own sessions
      if (targetUserId !== authUser.userId && 
          authUser.role !== 'admin' && 
          authUser.role !== 'super_admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      
      await Session.updateMany(
        { user: targetUserId, isActive: true },
        { isActive: false }
      );
      
      return NextResponse.json({ success: true, message: 'All sessions revoked' });
    }
    
    if (action === 'extend') {
      // Extend session expiration
      const session = await Session.findById(sessionId);
      
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      
      // Check permission
      const isOwnSession = session.user.toString() === authUser.userId;
      const isAdmin = authUser.role === 'admin' || authUser.role === 'super_admin';
      
      if (!isOwnSession && !isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      session.expiresAt = expiresAt;
      await session.save();
      
      return NextResponse.json({ success: true, message: 'Session extended' });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Patch session error:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}

// Clean up expired sessions
export async function DELETE(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const cleanExpired = searchParams.get('expired') === 'true';
    
    if (sessionId) {
      // Delete specific session
      const session = await Session.findById(sessionId);
      
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      
      const isOwnSession = session.user.toString() === authUser.userId;
      const isAdmin = authUser.role === 'admin' || authUser.role === 'super_admin';
      
      if (!isOwnSession && !isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      
      await Session.findByIdAndDelete(sessionId);
      return NextResponse.json({ success: true, message: 'Session deleted' });
    }
    
    if (cleanExpired) {
      // Clean up expired sessions (handled by MongoDB TTL, but can manually trigger)
      const result = await Session.deleteMany({
        expiresAt: { $lt: new Date() },
        isActive: false,
      });
      
      return NextResponse.json({ 
        success: true, 
        message: `Deleted ${result.deletedCount} expired sessions` 
      });
    }
    
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Delete session error:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
