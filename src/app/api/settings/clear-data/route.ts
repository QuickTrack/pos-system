import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import { getAuthUser } from '@/lib/auth-server';
import { isSuperAdmin } from '@/lib/auth';
import '@/models';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only super admins can clear system data
    if (!isSuperAdmin(user.role as any)) {
      return NextResponse.json(
        { error: 'Forbidden: Only super admins can clear system data' },
        { status: 403 }
      );
    }

    await dbConnect();

    const data = await request.json();
    
    // Verify confirmation text
    if (data.confirmationText !== 'DELETE ALL DATA') {
      return NextResponse.json(
        { error: 'Invalid confirmation text' },
        { status: 400 }
      );
    }

    // Get all mongoose models
    const mongoose = await import('mongoose');
    const models = mongoose.models;

    // Models to preserve (essential for system operation)
    const preserveModels = [
      'User',
      'Branch',
      'Settings',
      'License',
      'Session',
    ];

    // Get all model names to delete
    const modelsToDelete = Object.keys(models).filter(
      modelName => !preserveModels.includes(modelName)
    );

    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Delete data from all non-preserved models
      for (const modelName of modelsToDelete) {
        const model = models[modelName];
        if (model && model.deleteMany) {
          await model.deleteMany({}, { session });
        }
      }

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      return NextResponse.json({
        success: true,
        message: 'All system data has been cleared successfully',
        deletedModels: modelsToDelete,
      });
    } catch (error) {
      // Rollback transaction on error
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error('Clear system data error:', error);
    return NextResponse.json(
      { error: 'Failed to clear system data' },
      { status: 500 }
    );
  }
}
