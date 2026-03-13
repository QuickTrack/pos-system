import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-server';

export async function GET() {
  try {
    const user = await getAuthUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        role: user.role,
        branch: user.branch,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
