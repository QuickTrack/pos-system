import { NextResponse } from 'next/server';
import os from 'os';

export async function GET() {
  try {
    const hostname = os.hostname();
    return NextResponse.json({
      success: true,
      hostname,
    });
  } catch (error) {
    console.error('Get system info error:', error);
    return NextResponse.json({ error: 'Failed to get system info' }, { status: 500 });
  }
}