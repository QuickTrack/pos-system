import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import License from '@/models/License';
import { getAuthUser } from '@/lib/auth-server';
import { isLicenseExpired, isLicenseExpiringSoon } from '@/lib/license';
import { generateHardwareId, hasHardwareChanged } from '@/lib/hardware-id';
import { 
  loadSystemLicense, 
  saveSystemLicense, 
  verifyHardwareMatch,
  updateLastValidated,
  SystemLicenseData 
} from '@/lib/system-license-storage';

/**
 * Hardware-Bound License Validation API
 * 
 * This endpoint validates licenses with hardware binding:
 * 1. First checks system-wide storage for existing license
 * 2. Validates license key against database
 * 3. Checks if hardware matches stored hardware ID
 * 4. If hardware changed, requires reactivation
 * 5. Updates system-wide storage with current hardware ID
 * 
 * This allows any user on the same machine to use the license
 * that was activated on that hardware.
 */

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Super admins can access regardless of license status
    const isSuperAdmin = authUser.role === 'super_admin';

    // Get current hardware ID
    const currentHardware = generateHardwareId();
    const currentHardwareHash = currentHardware.compositeHash;

    // FIRST: Check system-wide storage for existing license on this hardware
    // This allows any user on the same machine to use the license
    const systemLicense = loadSystemLicense();
    
    if (systemLicense) {
      // Verify hardware matches
      const hardwareMatch = verifyHardwareMatch(currentHardwareHash);
      
      if (hardwareMatch.matches || isSuperAdmin) {
        // Hardware matches or is super admin - validate the license from database
        const licenseKey = systemLicense.licenseKey;
        const normalizedKey = licenseKey.toUpperCase();
        
        const license = await License.findOne({ licenseKey: normalizedKey });
        
        if (license) {
          const licenseData = license.toObject();
          
          // Check if suspended
          if (licenseData.status === 'suspended' && !isSuperAdmin) {
            return NextResponse.json({
              licensed: false,
              status: 'suspended',
              isSuperAdmin: false,
              message: 'Your license has been suspended. Please contact support.',
              hardwareId: currentHardwareHash,
            }, { status: 403 });
          }
          
          // Check if expired
          const expired = isLicenseExpired(licenseData.expirationDate);
          const isLifetime = licenseData.licenseType === 'lifetime';
          
          if (expired && !isLifetime && !isSuperAdmin) {
            return NextResponse.json({
              licensed: false,
              status: 'expired',
              expirationDate: licenseData.expirationDate,
              isSuperAdmin: false,
              message: 'Your license has expired. Please renew to continue using the system.',
              renewalUrl: '/license/renew',
              hardwareId: currentHardwareHash,
            }, { status: 403 });
          }
          
          // License is valid - update system storage and return success
          const systemLicenseData: SystemLicenseData = {
            licenseKey: licenseData.licenseKey,
            hardwareHash: currentHardwareHash,
            activatedAt: systemLicense.activatedAt,
            lastValidated: new Date().toISOString(),
            businessName: licenseData.businessName,
            email: licenseData.email,
            licenseType: licenseData.licenseType,
            status: licenseData.status,
            expirationDate: licenseData.expirationDate,
          };
          
          saveSystemLicense(systemLicenseData);
          updateLastValidated();
          
          const daysRemaining = Math.ceil(
            (new Date(licenseData.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          
          const expiringSoon = isLicenseExpiringSoon(licenseData.expirationDate, 30);
          
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
            hardwareId: currentHardwareHash,
            hardwareBound: true,
          });
        }
      } else if (hardwareMatch.storedHash) {
        // Hardware mismatch - require reactivation
        return NextResponse.json({
          licensed: false,
          valid: false,
          status: 'hardware_mismatch',
          isSuperAdmin: false,
          message: 'Hardware has changed. Please reactivate your license on this computer.',
          requiresReactivation: true,
          storedHardwareId: hardwareMatch.storedHash,
          currentHardwareId: currentHardwareHash,
          hardwareId: currentHardwareHash,
        }, { status: 403 });
      }
    }

    // SECOND: If no system license or validation failed, check for license key in request
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
          hardwareId: currentHardwareHash,
        });
      }
      return NextResponse.json({ 
        error: 'No license key provided',
        licensed: false,
        requiresActivation: true,
        isSuperAdmin: false,
        hardwareId: currentHardwareHash,
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
          hardwareId: currentHardwareHash,
        });
      }
      
      return NextResponse.json({
        error: 'License not found',
        licensed: false,
        requiresActivation: true,
        isSuperAdmin: false,
        hardwareId: currentHardwareHash,
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
        hardwareId: currentHardwareHash,
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
        hardwareId: currentHardwareHash,
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
        hardwareId: currentHardwareHash,
      });
    }

    // Check hardware binding
    const hardwareMatch = verifyHardwareMatch(currentHardwareHash);
    
    if (!hardwareMatch.matches && !isSuperAdmin) {
      // Hardware has changed - require reactivation
      return NextResponse.json({
        licensed: false,
        valid: false,
        status: 'hardware_mismatch',
        isSuperAdmin: false,
        message: 'Hardware has changed. Please reactivate your license on this computer.',
        requiresReactivation: true,
        storedHardwareId: hardwareMatch.storedHash,
        currentHardwareId: currentHardwareHash,
        hardwareId: currentHardwareHash,
      }, { status: 403 });
    }

    // Check if expiring soon
    const expiringSoon = isLicenseExpiringSoon(licenseData.expirationDate, 30);
    const daysRemaining = Math.ceil(
      (new Date(licenseData.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    // Update system-wide storage with current hardware ID
    const systemLicenseData: SystemLicenseData = {
      licenseKey: licenseData.licenseKey,
      hardwareHash: currentHardwareHash,
      activatedAt: new Date().toISOString(),
      lastValidated: new Date().toISOString(),
      businessName: licenseData.businessName,
      email: licenseData.email,
      licenseType: licenseData.licenseType,
      status: licenseData.status,
      expirationDate: licenseData.expirationDate,
    };
    
    saveSystemLicense(systemLicenseData);
    updateLastValidated();

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
      hardwareId: currentHardwareHash,
      hardwareBound: true,
    });
  } catch (error) {
    console.error('Error validating hardware-bound license:', error);
    return NextResponse.json({ error: 'Failed to validate license' }, { status: 500 });
  }
}

/**
 * POST endpoint for activating license with hardware binding
 */
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { licenseKey } = body;

    if (!licenseKey) {
      return NextResponse.json({ error: 'License key is required' }, { status: 400 });
    }

    const normalizedKey = licenseKey.toUpperCase();

    // Find the license
    const license = await License.findOne({ licenseKey: normalizedKey });

    if (!license) {
      return NextResponse.json({
        error: 'License not found',
        success: false,
      }, { status: 404 });
    }

    const licenseData = license.toObject();

    // Check if license is valid
    if (licenseData.status === 'suspended') {
      return NextResponse.json({
        error: 'License is suspended',
        success: false,
      }, { status: 403 });
    }

    const expired = isLicenseExpired(licenseData.expirationDate);
    const isLifetime = licenseData.licenseType === 'lifetime';

    if (expired && !isLifetime) {
      return NextResponse.json({
        error: 'License is expired',
        success: false,
      }, { status: 403 });
    }

    // Get current hardware ID
    const currentHardware = generateHardwareId();
    const currentHardwareHash = currentHardware.compositeHash;

    // Save to system-wide storage
    const systemLicenseData: SystemLicenseData = {
      licenseKey: licenseData.licenseKey,
      hardwareHash: currentHardwareHash,
      activatedAt: new Date().toISOString(),
      lastValidated: new Date().toISOString(),
      businessName: licenseData.businessName,
      email: licenseData.email,
      licenseType: licenseData.licenseType,
      status: licenseData.status,
      expirationDate: licenseData.expirationDate,
    };
    
    const saved = saveSystemLicense(systemLicenseData);
    
    if (!saved) {
      return NextResponse.json({
        error: 'Failed to save license to system storage',
        success: false,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'License activated successfully',
      license: {
        licenseKey: licenseData.licenseKey,
        businessName: licenseData.businessName,
        email: licenseData.email,
        licenseType: licenseData.licenseType,
        status: licenseData.status,
        expirationDate: licenseData.expirationDate,
        daysRemaining: isLifetime ? null : Math.ceil(
          (new Date(licenseData.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        ),
        maxUsers: licenseData.maxUsers,
        maxBranches: licenseData.maxBranches,
        features: licenseData.features,
      },
      hardwareId: currentHardwareHash,
      hardwareBound: true,
    });
  } catch (error) {
    console.error('Error activating hardware-bound license:', error);
    return NextResponse.json({ error: 'Failed to activate license' }, { status: 500 });
  }
}
