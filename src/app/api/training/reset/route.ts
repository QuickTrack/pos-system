import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Product from '@/models/Product';
import Customer from '@/models/Customer';
import Supplier from '@/models/Supplier';
import Sale from '@/models/Sale';
import Purchase from '@/models/Purchase';
import CustomerInvoice from '@/models/CustomerInvoice';
import SupplierInvoice from '@/models/SupplierInvoice';
import Category from '@/models/Category';
import Branch from '@/models/Branch';
import Settings from '@/models/Settings';

const TRAINING_BRANCH_ID = 'training-branch-001';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Clear all training data
    await Product.deleteMany({ branch: TRAINING_BRANCH_ID });
    await Customer.deleteMany({ branch: TRAINING_BRANCH_ID });
    await Supplier.deleteMany({ branch: TRAINING_BRANCH_ID });
    await Sale.deleteMany({ branch: TRAINING_BRANCH_ID });
    await Purchase.deleteMany({ branch: TRAINING_BRANCH_ID });
    await CustomerInvoice.deleteMany({ branch: TRAINING_BRANCH_ID });
    await SupplierInvoice.deleteMany({ branch: TRAINING_BRANCH_ID });
    await Category.deleteMany({ branch: TRAINING_BRANCH_ID });
    await Branch.deleteMany({ _id: TRAINING_BRANCH_ID });
    await Settings.deleteMany({ branch: TRAINING_BRANCH_ID });

    return NextResponse.json({
      success: true,
      message: 'Training data reset successfully',
    });
  } catch (error) {
    console.error('Error resetting training data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset training data' },
      { status: 500 }
    );
  }
}
