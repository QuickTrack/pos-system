import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';

import dbConnect from '@/lib/db/mongodb';
import mongoose from 'mongoose';
import User from '@/models/User';
import Shift from '@/models/Shift';
import Register from '@/models/Register';
import Session from '@/models/Session';
import ActivityLog from '@/models/ActivityLog';
import { generateToken, JWTPayload } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { pin, switchCashier } = await request.json();

    if (!pin) {
      return NextResponse.json(
        { success: false, error: 'PIN is required' },
        { status: 400 }
      );
    }

    const pinStr = String(pin).trim();
    if (!/^\d{4,6}$/.test(pinStr)) {
      return NextResponse.json(
        { success: false, error: 'Invalid PIN format' },
        { status: 400 }
      );
    }

    const cashiers = await User.find({
      role: 'cashier',
      isActive: true,
      pin: { $exists: true, $ne: null },
    });

    let matchedUser = null;
    for (const cashier of cashiers) {
      if (await cashier.comparePin(pinStr)) {
        matchedUser = cashier;
        break;
      }
    }

    if (!matchedUser) {
      const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';
      
      // Log failed attempt if we have a cashier to attribute to
      if (cashiers.length > 0) {
        ActivityLog.create({
          user: cashiers[0]._id,
          userName: cashiers[0].name,
          action: 'cashier_login_failed',
          module: 'users',
          description: `Failed cashier PIN login attempt`,
          ipAddress,
          userAgent,
        }).catch(() => {});
      }

      return NextResponse.json(
        { success: false, error: 'Invalid PIN' },
        { status: 401 }
      );
    }

    // Check for active shift conflict
    const matchedUserId = matchedUser._id;
    const matchedUserName = matchedUser.name;
    const matchedUserEmail = matchedUser.email;
    const matchedUserRole = matchedUser.role;
    const matchedUserBranch = matchedUser.branch;

    const activeShift = await Shift.findOne({ status: 'open' }).sort({ startTime: -1 }).lean();
    if (activeShift && !switchCashier) {
      const activeCashierId = activeShift.cashier?._id?.toString() || activeShift.cashier?.toString();
      const requestingCashierId = matchedUserId.toString();
      if (activeCashierId !== requestingCashierId) {
        return NextResponse.json(
          { success: false, error: `An active shift is already in progress for register ${activeShift.registerNumber} by ${activeShift.cashierName}. Only the assigned cashier or a super admin can log in.` },
          { status: 403 }
        );
      }
    }

    // Transfer active shift to new cashier when switching cashiers
    let shiftTransferred = false;
    if (switchCashier && activeShift) {
      try {
        await Shift.updateOne(
          { _id: (activeShift as any)._id },
          {
            $set: {
              cashier: matchedUserId,
              cashierName: matchedUserName,
            },
          }
        );

        const register = await Register.findById((activeShift as any).register);
        if (register) {
          register.currentShift = (activeShift as any)._id;
          await register.save();
        }

        await ActivityLog.create({
          user: matchedUserId,
          userName: matchedUserName,
          action: 'cashier_switch_transfer',
          module: 'system',
          description: `Cashier ${matchedUserName} switched from ${activeShift.cashierName}; transferred shift ${activeShift.shiftId} on register ${activeShift.registerNumber}`,
          branch: (activeShift as any).branch,
        });

        shiftTransferred = true;
      } catch (err) {
        console.error('Failed to transfer shift on cashier switch:', err);
      }
    }

    const payload: JWTPayload = {
      userId: matchedUserId.toString(),
      email: matchedUserEmail,
      name: matchedUserName,
      role: matchedUserRole,
      branch: matchedUserBranch?.toString(),
    };

    const token = generateToken(payload);
    const tokenId = uuidv4();

    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await Session.create({
      user: matchedUserId,
      userName: matchedUserName,
      userEmail: matchedUserEmail,
      tokenId,
      ipAddress,
      userAgent,
      isActive: true,
      lastActivity: new Date(),
      expiresAt,
      isQuickLogin: true,
    });

    await ActivityLog.create({
      user: matchedUserId,
      userName: matchedUserName,
      action: 'cashier_login',
      module: 'users',
      description: `Cashier logged in via quick PIN`,
      ipAddress,
      userAgent,
    });

    matchedUser.lastLogin = new Date();
    await matchedUser.save();

    const preserveToken = request.cookies.get('auth-token')?.value || null;

    const response = NextResponse.json({
      success: true,
      preserveToken,
      shiftTransferred,
      user: {
        id: matchedUserId,
        name: matchedUserName,
        email: matchedUserEmail,
        phone: matchedUser.phone,
        role: matchedUserRole,
        branch: matchedUserBranch,
      },
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Cashier login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
