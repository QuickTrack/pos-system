import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { preserveToken } = body;

    if (!preserveToken || typeof preserveToken !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid restore token' },
        { status: 400 }
      );
    }

    const payload = verifyToken(preserveToken);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired restore token' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true });

    response.cookies.set('auth-token', preserveToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Restore session error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
