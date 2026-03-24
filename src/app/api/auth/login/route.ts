import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import User from '@/models/User';
import Session from '@/models/Session';
import ActivityLog from '@/models/ActivityLog';
import { generateToken, JWTPayload } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated' },
        { status: 401 }
      );
    }
    
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      // Log failed login attempt
      await ActivityLog.create({
        user: user._id,
        userName: user.name,
        action: 'login_failed',
        module: 'users',
        description: `Failed login attempt for ${user.email}`,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent'),
      });
      
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    const payload: JWTPayload = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      branch: user.branch?.toString(),
    };
    
    const token = generateToken(payload);
    const tokenId = uuidv4(); // Unique ID for this login session
    
    // Get client info
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Create session record
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    
    await Session.create({
      user: user._id,
      userName: user.name,
      userEmail: user.email,
      tokenId,
      ipAddress,
      userAgent,
      isActive: true,
      lastActivity: new Date(),
      expiresAt,
    });
    
    // Log successful login
    await ActivityLog.create({
      user: user._id,
      userName: user.name,
      action: 'login',
      module: 'users',
      description: `User logged in from ${ipAddress}`,
      ipAddress,
      userAgent,
    });
    
    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        branch: user.branch,
      },
    });
    
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
