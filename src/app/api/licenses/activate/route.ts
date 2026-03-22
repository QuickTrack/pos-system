import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import License from '@/models/License';
import { getAuthUser } from '@/lib/auth-server';
import {
  validateLicenseKeyFormat,
  getLicenseTypeFromKey,
  calculateExpirationDate,
  isLicenseExpired,
} from '@/lib/license';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    const body = await req.json();
    const { 
      licenseKey, 
      businessName, 
      email, 
      phone,
      address,
      taxNumber,
      industry,
      contactPerson,
      planType
    } = body;

    // Check if this is a trial activation (no license key required)
    const isTrialRequest = planType === 'trial' || licenseKey === 'TRIAL-ACTIVATION';
    
    // For trial, we don't require authentication or license key
    if (isTrialRequest) {
      // Validate required fields for trial
      if (!businessName) {
        return NextResponse.json({ error: 'Business name is required for trial' }, { status: 400 });
      }
      
      if (!email) {
        return NextResponse.json({ error: 'Email address is required for trial' }, { status: 400 });
      }

      // Generate a unique trial license key
      const trialKey = `TRIAL-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      const licenseType = 'trial';
      const expirationDate = calculateExpirationDate(licenseType);

      // Check if a trial license already exists for this email
      const existingTrial = await License.findOne({ 
        email,
        licenseType: 'trial'
      });

      if (existingTrial) {
        // Check if trial is still valid
        if (existingTrial.expirationDate > new Date() && existingTrial.status === 'active') {
          return NextResponse.json({
            message: 'Trial already active',
            license: {
              licenseKey: existingTrial.licenseKey,
              businessName: existingTrial.businessName,
              expirationDate: existingTrial.expirationDate,
              daysRemaining: Math.ceil((existingTrial.expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
              licenseType: existingTrial.licenseType,
              status: existingTrial.status,
            },
            isTrial: true,
            alreadyActive: true,
          });
        } else {
          // Trial expired, reactivate it
          existingTrial.expirationDate = expirationDate;
          existingTrial.status = 'active';
          existingTrial.activationDate = new Date();
          await existingTrial.save();
          
          return NextResponse.json({
            message: 'Trial reactivated successfully',
            license: {
              licenseKey: existingTrial.licenseKey,
              businessName: existingTrial.businessName,
              expirationDate: existingTrial.expirationDate,
              daysRemaining: 14,
              licenseType: existingTrial.licenseType,
              status: existingTrial.status,
            },
            isTrial: true,
          });
        }
      }

      // Create new trial license
      const newLicense = await License.create({
        licenseKey: trialKey,
        businessName,
        email,
        phone,
        address,
        taxNumber,
        industry,
        contactPerson,
        activationDate: new Date(),
        expirationDate,
        licenseType: 'trial',
        status: 'active',
        maxUsers: 3,
        maxBranches: 1,
        features: ['pos', 'inventory', 'customers'],
        activatedBy: email,
      });

      return NextResponse.json({
        message: 'Trial license activated successfully',
        license: {
          licenseKey: newLicense.licenseKey,
          businessName: newLicense.businessName,
          email: newLicense.email,
          expirationDate: newLicense.expirationDate,
          daysRemaining: 14,
          licenseType: newLicense.licenseType,
          status: newLicense.status,
        },
        isTrial: true,
      });
    }

    // For non-trial activations, require authentication
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!licenseKey) {
      return NextResponse.json({ error: 'License key is required' }, { status: 400 });
    }

    // Validate key format
    if (!validateLicenseKeyFormat(licenseKey)) {
      return NextResponse.json({ 
        error: 'Invalid license key format. Expected: POS-XXXX-XXXX-XXXX-XXXX',
        code: 'INVALID_FORMAT'
      }, { status: 400 });
    }

    // Normalize key to uppercase
    const normalizedKey = licenseKey.toUpperCase();

    // Check if this is a renewal key
    const isRenewalKey = normalizedKey.startsWith('REN-');

    if (isRenewalKey) {
      // Find the existing license by business name/email to renew
      const existingLicense = await License.findOne({
        businessName,
        email,
        status: { $ne: 'suspended' },
      });

      if (!existingLicense) {
        return NextResponse.json({
          error: 'No existing license found for this business. Please activate with your original license key first.',
          code: 'NO_EXISTING_LICENSE'
        }, { status: 404 });
      }

      // Get license type from original key or use annual
      const licenseType = existingLicense.licenseType || 'annual';
      const newExpiration = calculateExpirationDate(licenseType);
      const previousExpiration = existingLicense.expirationDate;

      // Update license with renewal
      existingLicense.expirationDate = newExpiration;
      existingLicense.status = 'active';
      existingLicense.renewalHistory.push({
        date: new Date(),
        previousExpiration,
        newExpiration,
        renewalKey: normalizedKey,
      });

      await existingLicense.save();

      // Store license key in localStorage on client side
      return NextResponse.json({
        message: 'License renewed successfully',
        license: {
          licenseKey: existingLicense.licenseKey,
          businessName: existingLicense.businessName,
          expirationDate: existingLicense.expirationDate,
          daysRemaining: Math.ceil((newExpiration.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
          licenseType: existingLicense.licenseType,
          status: existingLicense.status,
        },
        isRenewal: true,
      });
    }

    // Check if license key already exists
    const existingKey = await License.findOne({ licenseKey: normalizedKey });
    
    if (existingKey) {
      // Check if already activated
      if (existingKey.activationDate) {
        return NextResponse.json({
          error: 'This license key has already been activated',
          code: 'ALREADY_ACTIVATED',
          expiresAt: existingKey.expirationDate,
        }, { status: 400 });
      }

      // Activate the pre-generated license
      const licenseType = getLicenseTypeFromKey(normalizedKey) || 'annual';
      const expirationDate = calculateExpirationDate(licenseType);

      existingKey.activationDate = new Date();
      existingKey.expirationDate = expirationDate;
      existingKey.status = 'active';
      existingKey.activatedBy = email;

      // Update business info if provided
      if (businessName) existingKey.businessName = businessName;
      if (email) existingKey.email = email;
      if (phone) existingKey.phone = phone;
      if (address) existingKey.address = address;
      if (taxNumber) existingKey.taxNumber = taxNumber;
      if (industry) existingKey.industry = industry;
      if (contactPerson) existingKey.contactPerson = contactPerson;

      await existingKey.save();

      return NextResponse.json({
        message: 'License activated successfully',
        license: {
          licenseKey: existingKey.licenseKey,
          businessName: existingKey.businessName,
          expirationDate: existingKey.expirationDate,
          daysRemaining: Math.ceil((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
          licenseType: existingKey.licenseType,
          status: existingKey.status,
        },
      });
    }

    // Check if this is a free trial (for new businesses without a pre-generated key)
    const trialKeyCheck = normalizedKey.replace(/^POS-/i, 'POS-T');
    const isTrial = trialKeyCheck.startsWith('POS-T');

    if (isTrial) {
      // Create a new trial license
      const licenseType = 'trial';
      const expirationDate = calculateExpirationDate(licenseType);

      const newLicense = await License.create({
        licenseKey: normalizedKey,
        businessName: businessName || 'Trial Business',
        email: email || authUser.email,
        phone,
        address,
        taxNumber,
        industry,
        contactPerson,
        activationDate: new Date(),
        expirationDate,
        licenseType: 'trial',
        status: 'active',
        maxUsers: 3,
        maxBranches: 1,
        features: ['pos', 'inventory', 'customers'],
        activatedBy: email || authUser.email,
      });

      return NextResponse.json({
        message: 'Trial license activated successfully',
        license: {
          licenseKey: newLicense.licenseKey,
          businessName: newLicense.businessName,
          expirationDate: newLicense.expirationDate,
          daysRemaining: 14,
          licenseType: newLicense.licenseType,
          status: newLicense.status,
        },
        isTrial: true,
      });
    }

    // License key not found
    return NextResponse.json({
      error: 'License key not found. Please check your key or contact support.',
      code: 'KEY_NOT_FOUND'
    }, { status: 404 });

  } catch (error) {
    console.error('Error activating license:', error);
    return NextResponse.json({ error: 'Failed to activate license' }, { status: 500 });
  }
}
