import mongoose from 'mongoose';
import Customer from '@/models/Customer';
import CustomerInvoice from '@/models/CustomerInvoice';
import CustomerPayment from '@/models/CustomerPayment';
import Sale from '@/models/Sale';

const OUTSTANDING_INVOICE_STATUSES = ['sent', 'partial', 'overdue'];

export async function calculateCustomerBalanceDue(customerId: string | mongoose.Types.ObjectId, branchId?: string | mongoose.Types.ObjectId) {
  const customerIdObject = new mongoose.Types.ObjectId(customerId);
  const branchQuery = branchId ? { branch: new mongoose.Types.ObjectId(branchId) } : {};

  const invoiceAggregate = await CustomerInvoice.aggregate([
    {
      $match: {
        customer: customerIdObject,
        status: { $in: OUTSTANDING_INVOICE_STATUSES },
        ...branchQuery,
      },
    },
    {
      $group: {
        _id: null,
        total: {
          $sum: {
            $max: [
              { $subtract: [{ $ifNull: ['$total', 0] }, { $ifNull: ['$amountPaid', 0] }] },
              0,
            ],
          },
        },
      },
    },
  ]);

  const saleAggregate = await Sale.aggregate([
    {
      $match: {
        customer: customerIdObject,
        paymentMethod: 'account',
        status: 'completed',
        ...branchQuery,
      },
    },
    {
      $group: {
        _id: null,
        total: {
          $sum: {
            $max: [
              { $subtract: [{ $ifNull: ['$total', 0] }, { $ifNull: ['$amountPaid', 0] }] },
              0,
            ],
          },
        },
      },
    },
  ]);

  const paymentAggregate = await CustomerPayment.aggregate([
    {
      $match: {
        customer: customerIdObject,
        status: { $in: ['paid', 'completed'] },
        $or: [
          { invoiceNumbers: { $size: 0 } },
          { invoiceNumbers: { $exists: false } },
        ],
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
      },
    },
  ]);

  const invoiceTotal = invoiceAggregate[0]?.total || 0;
  const saleTotal = saleAggregate[0]?.total || 0;
  const paymentTotal = paymentAggregate[0]?.total || 0;

  return Math.max(0, invoiceTotal + saleTotal - paymentTotal);
}

export async function syncCustomerBalanceDue(customerId: string | mongoose.Types.ObjectId, branchId?: string | mongoose.Types.ObjectId) {
  const balanceDue = await calculateCustomerBalanceDue(customerId, branchId);
  await Customer.findByIdAndUpdate(customerId, { $set: { balanceDue } });
  return balanceDue;
}
