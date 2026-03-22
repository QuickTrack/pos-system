import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import License from '@/models/License';
import { getAuthUser } from '@/lib/auth-server';
import {
  generateLicenseKey,
  generateRenewalKey,
  validateLicenseKeyFormat,
  getLicenseTypeFromKey,
  calculateExpirationDate,
} from '@/lib/license';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can list all licenses
    if (authUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const query: Record<string, unknown> = {};
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;
    const licenses = await License.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await License.countDocuments(query);

    return NextResponse.json({
      licenses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching licenses:', error);
    return NextResponse.json({ error: 'Failed to fetch licenses' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can generate licenses
    if (authUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { 
      businessName, 
      email, 
      phone, 
      licenseType = 'annual',
      maxUsers = 10,
      maxBranches = 5,
      features = ['pos', 'inventory', 'customers', 'suppliers', 'reports'],
      customExpiration 
    } = body;

    if (!businessName || !email) {
      return NextResponse.json({ error: 'Business name and email are required' }, { status: 400 });
    }

    // Generate license key
    const licenseKey = generateLicenseKey(licenseType, businessName);
    
    // Calculate expiration date
    let expirationDate: Date;
    if (customExpiration) {
      expirationDate = new Date(customExpiration);
    } else {
      expirationDate = calculateExpirationDate(licenseType);
    }

    // Create license
    const license = await License.create({
      licenseKey,
      businessName,
      email,
      phone,
      expirationDate,
      licenseType,
      status: 'active', // Pre-activated for admin-generated keys
      maxUsers,
      maxBranches,
      features,
      activationDate: new Date(),
      activatedBy: authUser.email,
    });

    return NextResponse.json({
      message: 'License generated successfully',
      license: {
        licenseKey: license.licenseKey,
        businessName: license.businessName,
        email: license.email,
        expirationDate: license.expirationDate,
        licenseType: license.licenseType,
        status: license.status,
      },
    });
  } catch (error) {
    console.error('Error generating license:', error);
    return NextResponse.json({ error: 'Failed to generate license' }, { status: 500 });
  }
}

// PUT method - only for trial license upgrades (legacy compatibility)
export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can upgrade licenses
    if (authUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { licenseId, action, newLicenseType, maxUsers, maxBranches } = body;

    // Delegate to PATCH for all actions
    return handleLicenseAction(licenseId, action || 'upgrade', { newLicenseType, maxUsers, maxBranches }, authUser);
  } catch (error) {
    console.error('Error in PUT:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

// PATCH method - handles all license actions: upgrade, downgrade, suspend, restore
export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can modify licenses
    if (authUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { licenseId, action, newLicenseType, maxUsers, maxBranches, suspensionReason } = body;

    return handleLicenseAction(licenseId, action, { newLicenseType, maxUsers, maxBranches, suspensionReason }, authUser);
  } catch (error) {
    console.error('Error in PATCH:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

async function handleLicenseAction(licenseId: string, action: string, data: any, authUser: any) {
  if (!licenseId) {
    return NextResponse.json({ error: 'License ID is required' }, { status: 400 });
  }

  const { newLicenseType, maxUsers, maxBranches, suspensionReason } = data;

  // Find the license
  const license = await License.findById(licenseId);
  
  if (!license) {
    return NextResponse.json({ error: 'License not found' }, { status: 404 });
  }

  // Initialize history arrays if not present
  if (!license.upgradeHistory) license.upgradeHistory = [];
  if (!license.statusHistory) license.statusHistory = [];

  switch (action) {
    case 'upgrade':
      // Upgrade from trial to paid
      if (license.licenseType !== 'trial') {
        return NextResponse.json({ error: 'Only trial licenses can be upgraded' }, { status: 400 });
      }

      const newLicenseKey = generateLicenseKey(newLicenseType || 'annual');
      const newExpirationDate = calculateExpirationDate(newLicenseType || 'annual');

      license.licenseKey = newLicenseKey;
      license.licenseType = newLicenseType || 'annual';
      license.expirationDate = newExpirationDate;
      license.status = 'active';
      if (!license.activationDate) license.activationDate = new Date();
      
      if (maxUsers) license.maxUsers = maxUsers;
      if (maxBranches) license.maxBranches = maxBranches;

      license.upgradeHistory.push({
        date: new Date(),
        fromType: 'trial',
        toType: newLicenseType || 'annual',
        newKey: newLicenseKey,
      });

      await license.save();

      return NextResponse.json({
        message: 'License upgraded successfully',
        action: 'upgrade',
        license: getLicenseResponse(license),
      });

    case 'downgrade':
      // Downgrade to lower tier (e.g., annual to trial, or lifetime to annual)
      if (newLicenseType === license.licenseType) {
        return NextResponse.json({ error: 'Select a different license type to downgrade' }, { status: 400 });
      }

      // Prevent downgrade to trial from paid
      if (newLicenseType === 'trial') {
        return NextResponse.json({ error: 'Cannot downgrade to trial license' }, { status: 400 });
      }

      const downgradeKey = generateLicenseKey(newLicenseType);
      const downgradeExpirationDate = calculateExpirationDate(newLicenseType);

      license.licenseKey = downgradeKey;
      license.licenseType = newLicenseType;
      license.expirationDate = downgradeExpirationDate;
      license.status = 'active';

      if (maxUsers) license.maxUsers = maxUsers;
      if (maxBranches) license.maxBranches = maxBranches;

      license.upgradeHistory.push({
        date: new Date(),
        fromType: license.licenseType,
        toType: newLicenseType,
        action: 'downgrade',
        newKey: downgradeKey,
      });

      await license.save();

      return NextResponse.json({
        message: `License downgraded to ${newLicenseType} successfully`,
        action: 'downgrade',
        license: getLicenseResponse(license),
      });

    case 'suspend':
      // Suspend the license
      if (license.status === 'suspended') {
        return NextResponse.json({ error: 'License is already suspended' }, { status: 400 });
      }

      license.status = 'suspended';
      license.suspensionReason = suspensionReason || 'Suspended by administrator';
      license.suspendedAt = new Date();
      license.suspendedBy = authUser.email;

      license.statusHistory.push({
        date: new Date(),
        action: 'suspended',
        reason: suspensionReason || 'Suspended by administrator',
        performedBy: authUser.email,
      });

      await license.save();

      return NextResponse.json({
        message: 'License suspended successfully',
        action: 'suspend',
        license: getLicenseResponse(license),
      });

    case 'restore':
      // Restore/activate a suspended license
      if (license.status !== 'suspended') {
        return NextResponse.json({ error: 'License is not suspended' }, { status: 400 });
      }

      license.status = 'active';
      license.suspensionReason = null;
      license.suspendedAt = null;
      license.suspendedBy = null;
      license.restoredAt = new Date();
      license.restoredBy = authUser.email;

      // If license was expired when suspended, check expiration
      if (new Date(license.expirationDate) < new Date()) {
        license.status = 'expired';
      }

      license.statusHistory.push({
        date: new Date(),
        action: 'restored',
        performedBy: authUser.email,
      });

      await license.save();

      return NextResponse.json({
        message: 'License restored successfully',
        action: 'restore',
        license: getLicenseResponse(license),
      });

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}

function getLicenseResponse(license: any) {
  const daysRemaining = license.licenseType === 'lifetime' 
    ? null 
    : Math.ceil((new Date(license.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return {
    _id: license._id,
    licenseKey: license.licenseKey,
    businessName: license.businessName,
    email: license.email,
    phone: license.phone,
    licenseType: license.licenseType,
    status: license.status,
    expirationDate: license.expirationDate,
    daysRemaining,
    maxUsers: license.maxUsers,
    maxBranches: license.maxBranches,
    features: license.features,
  };
}
