import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import License from '@/models/License';
import { getAuthUser } from '@/lib/auth-server';
import { isLicenseExpired, isLicenseExpiringSoon } from '@/lib/license';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    // Try to get authenticated user, but don't require it for license validation
    const authUser = await getAuthUser();
    
    // Super admins can access regardless of license status
    // This bypass only affects authentication - license info is still returned for display
    const isSuperAdmin = authUser?.role === 'super_admin';

    // Get license key from header or query
    const licenseKey = req.headers.get('x-license-key') || 
                       new URL(req.url).searchParams.get('licenseKey');

    // If no license key provided and not super admin, require activation
    if (!licenseKey) {
      if (isSuperAdmin) {
        // Super admin with no license key - bypass
        return NextResponse.json({
          licensed: true,
          valid: true,
          bypassed: true,
          isSuperAdmin: true,
          message: 'Super admin access - license bypassed',
          license: null,
          warnings: [],
        });
      }
      return NextResponse.json({ 
        error: 'No license key provided',
        licensed: false,
        requiresActivation: true,
        isSuperAdmin: false,
      }, { status: 400 });
    }

    const normalizedKey = licenseKey.toUpperCase();

    // Find the license
    const license = await License.findOne({ licenseKey: normalizedKey });

    if (!license) {
      // Super admins can still access even with invalid license key
      if (isSuperAdmin) {
        return NextResponse.json({
          licensed: true,
          valid: true,
          bypassed: true,
          isSuperAdmin: true,
          message: 'Super admin access - license check bypassed',
          license: null,
          warnings: [],
        });
      }
      
      return NextResponse.json({
        error: 'License not found',
        licensed: false,
        requiresActivation: true,
        isSuperAdmin: false,
      }, { status: 404 });
    }

    const licenseData = license.toObject();

    // Check if suspended - super admins can still access
    if (licenseData.status === 'suspended' && !isSuperAdmin) {
      return NextResponse.json({
        licensed: false,
        status: 'suspended',
        isSuperAdmin: false,
        message: 'Your license has been suspended. Please contact support.',
      }, { status: 403 });
    }

    // Check if expired
    const expired = isLicenseExpired(licenseData.expirationDate);
    const isLifetime = licenseData.licenseType === 'lifetime';

    if (expired && !isLifetime && !isSuperAdmin) {
      // Update status to expired
      await License.updateOne(
        { _id: license._id },
        { $set: { status: 'expired' } }
      );

      return NextResponse.json({
        licensed: false,
        status: 'expired',
        expirationDate: licenseData.expirationDate,
        isSuperAdmin: false,
        message: 'Your license has expired. Please renew to continue using the system.',
        renewalUrl: '/license/renew',
      }, { status: 403 });
    }

    // Super admins with expired license can still access
    if (expired && !isLifetime && isSuperAdmin) {
      return NextResponse.json({
        licensed: true,
        valid: true,
        bypassed: true,
        isSuperAdmin: true,
        status: 'expired',
        message: 'Super admin access - expired license bypassed',
        license: {
          licenseKey: licenseData.licenseKey,
          businessName: licenseData.businessName,
          email: licenseData.email,
          licenseType: licenseData.licenseType,
          status: licenseData.status,
          expirationDate: licenseData.expirationDate,
          daysRemaining: 0,
          maxUsers: licenseData.maxUsers,
          maxBranches: licenseData.maxBranches,
          features: licenseData.features,
        },
        warnings: [],
      });
    }

    // Check if expiring soon
    const expiringSoon = isLicenseExpiringSoon(licenseData.expirationDate, 30);
    const daysRemaining = Math.ceil(
      (new Date(licenseData.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    return NextResponse.json({
      licensed: true,
      valid: true,
      isSuperAdmin,
      license: {
        licenseKey: licenseData.licenseKey,
        businessName: licenseData.businessName,
        email: licenseData.email,
        licenseType: licenseData.licenseType,
        status: licenseData.status,
        expirationDate: licenseData.expirationDate,
        daysRemaining: isLifetime ? null : daysRemaining,
        maxUsers: licenseData.maxUsers,
        maxBranches: licenseData.maxBranches,
        features: licenseData.features,
      },
      warnings: expiringSoon && !isLifetime ? [
        {
          type: 'expiring_soon',
          message: `Your license expires in ${daysRemaining} days. Renew now to avoid interruption.`,
          daysRemaining,
        }
      ] : [],
    });
  } catch (error) {
    console.error('Error validating license:', error);
    return NextResponse.json({ error: 'Failed to validate license' }, { status: 500 });
  }
}
