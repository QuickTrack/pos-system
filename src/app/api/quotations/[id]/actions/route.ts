import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/mongodb';
import Quotation from '@/models/Quotation';
import CustomerInvoice from '@/models/CustomerInvoice';
import Customer from '@/models/Customer';
import Product from '@/models/Product';
import { getAuthUser } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';

function generateInvoiceNumber(sequence: number): string {
  const prefix = 'INV';
  return `${prefix}-${String(sequence).padStart(4, '0')}`;
}

async function getNextInvoiceNumber(): Promise<string> {
  const lastInvoice = await CustomerInvoice.findOne({
    invoiceNumber: { $regex: /^INV-\d{4}$/ }
  }).sort({ invoiceNumber: -1 });

  let sequence = 1;
  if (lastInvoice?.invoiceNumber) {
    const parts = lastInvoice.invoiceNumber.split('-');
    if (parts.length === 2) {
      const num = parseInt(parts[1], 10);
      if (!isNaN(num)) {
        sequence = num + 1;
      }
    }
  }

  return generateInvoiceNumber(sequence);
}

function parseDate(value: unknown, fallback: Date): Date {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function parsePositiveNumber(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

async function getCurrentCustomerDebt(customerId: string) {
  const currentOutstanding = await CustomerInvoice.aggregate([
    {
      $match: {
        customer: new mongoose.Types.ObjectId(customerId),
        invoiceType: 'sale',
        status: { $in: ['sent', 'partial', 'overdue'] }
      }
    },
    {
      $group: {
        _id: null,
        totalOutstanding: {
          $sum: { $subtract: ['$total', { $ifNull: ['$amountPaid', 0] }] }
        }
      }
    }
  ]);

  const Sale = (await import('@/models/Sale')).default;
  const salesOutstanding = await Sale.aggregate([
    {
      $match: {
        customer: new mongoose.Types.ObjectId(customerId),
        paymentMethod: 'account',
        status: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        totalOutstanding: {
          $sum: { $subtract: ['$total', { $ifNull: ['$amountPaid', 0] }] }
        }
      }
    }
  ]);

  return (currentOutstanding.length > 0 ? currentOutstanding[0].totalOutstanding : 0) +
    (salesOutstanding.length > 0 ? salesOutstanding[0].totalOutstanding : 0);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role as any, 'manage_sales')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const { action, data } = await request.json();
    const { id } = await params;
    const quotation = await Quotation.findById(id);

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    switch (action) {
      case 'send':
        quotation.status = 'sent';
        quotation.sentAt = new Date();
        break;

      case 'approve':
        quotation.status = 'sent';
        quotation.approved = true;
        quotation.approvedByName = user.name || user.email;
        quotation.approvedByDate = new Date();
        break;

      case 'reject':
        quotation.status = 'rejected';
        quotation.rejectedAt = new Date();
        break;

      case 'accept':
        quotation.status = 'accepted';
        quotation.acceptedAt = new Date();
        break;

      case 'convert': {
        const { convertToType, targetId } = data || {};
        quotation.status = 'converted';
        quotation.convertedToType = convertToType;
        quotation.convertedTo = targetId;
        quotation.convertedAt = new Date();
        break;
      }

      case 'convert_to_invoice': {
        const conversionData = data || {};

        if (
          quotation.status === 'converted' ||
          quotation.convertedToType === 'invoice' ||
          quotation.convertedTo
        ) {
          return NextResponse.json(
            { error: 'QUOTATION_ALREADY_CONVERTED', message: 'This quotation has already been converted to an invoice.' },
            { status: 400 }
          );
        }

        if (['cancelled', 'rejected'].includes(quotation.status)) {
          return NextResponse.json(
            { error: 'QUOTATION_NOT_CONVERTIBLE', message: 'Cancelled or rejected quotations cannot be converted to an invoice.' },
            { status: 400 }
          );
        }

        const isExpired = new Date(quotation.validUntil).getTime() < Date.now();
        if (isExpired && conversionData.allowExpired !== true) {
          return NextResponse.json(
            {
              error: 'QUOTATION_EXPIRED',
              message: 'This quotation has expired. Use the allowExpired option only when conversion is explicitly approved.',
              details: {
                validUntil: quotation.validUntil
              }
            },
            { status: 400 }
          );
        }

        if (conversionData.quotationVersion) {
          const quotedUpdatedAt = new Date(conversionData.quotationVersion).getTime();
          const currentUpdatedAt = new Date(quotation.updatedAt || quotation.createdAt).getTime();
          if (Number.isFinite(quotedUpdatedAt) && quotedUpdatedAt !== currentUpdatedAt) {
            return NextResponse.json(
              {
                error: 'QUOTATION_MODIFIED',
                message: 'The quotation changed after preview. Please refresh and convert again.'
              },
              { status: 409 }
            );
          }
        }

        if (!quotation.items || quotation.items.length === 0) {
          return NextResponse.json(
            { error: 'NO_ITEMS', message: 'Cannot convert quotation without line items.' },
            { status: 400 }
          );
        }

        if (!quotation.customer) {
          return NextResponse.json(
            { error: 'CUSTOMER_REQUIRED', message: 'Cannot convert quotation without a linked customer.' },
            { status: 400 }
          );
        }

        const invoiceNumber = typeof conversionData.invoiceNumber === 'string' && conversionData.invoiceNumber.trim()
          ? conversionData.invoiceNumber.trim()
          : await getNextInvoiceNumber();

        const existingInvoice = await CustomerInvoice.findOne({ invoiceNumber });
        if (existingInvoice) {
          return NextResponse.json(
            { error: 'DUPLICATE_INVOICE_NUMBER', message: 'Invoice number already exists.' },
            { status: 400 }
          );
        }

        const customer = quotation.customer ? await Customer.findById(quotation.customer) : null;
        const creditLimit = customer?.creditLimit || 0;

        const invoiceDate = parseDate(conversionData.invoiceDate, new Date());
        const paymentTerms = parsePositiveNumber(conversionData.paymentTerms, 30);
        const calculatedDueDate = new Date(invoiceDate);
        calculatedDueDate.setDate(calculatedDueDate.getDate() + paymentTerms);
        const dueDate = conversionData.dueDate
          ? parseDate(conversionData.dueDate, calculatedDueDate)
          : calculatedDueDate;
        const invoiceStatus = conversionData.status === 'sent' ? 'sent' : 'draft';

        const invoiceItems = quotation.items.map((item: any) => {
          const conversionToBase = parsePositiveNumber(item.conversionToBase, 1);
          const quantity = parsePositiveNumber(item.quantity, 0);
          const unitPrice = parsePositiveNumber(item.unitPrice, 0);

          return {
            product: item.product || undefined,
            productName: item.productName,
            sku: item.sku || '',
            quantity,
            unitName: item.unit,
            unitAbbreviation: item.unit,
            conversionToBase,
            unitPrice,
            discount: parsePositiveNumber(item.discount, 0),
            discountType: item.discountType || 'fixed',
            tax: parsePositiveNumber(item.tax, 0),
            total: parsePositiveNumber(item.total, quantity * unitPrice),
            baseQuantity: quantity * conversionToBase
          };
        });

        const invalidItems = invoiceItems.filter((item: any) =>
          item.quantity <= 0 ||
          item.unitPrice < 0 ||
          item.total < 0 ||
          !item.productName
        );

        if (invalidItems.length > 0) {
          return NextResponse.json(
            {
              error: 'INVALID_QUOTATION_ITEMS',
              message: 'One or more quotation line items are invalid.',
              details: invalidItems
            },
            { status: 400 }
          );
        }

        const subtotal = parsePositiveNumber(quotation.subtotal, invoiceItems.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0));
        const discountAmount = parsePositiveNumber(quotation.discountTotal, 0);
        const tax = parsePositiveNumber(quotation.vatTotal, invoiceItems.reduce((sum: number, item: any) => sum + (item.tax || 0), 0));
        const total = parsePositiveNumber(
          quotation.grandTotal,
          subtotal - discountAmount + tax + parsePositiveNumber(quotation.shippingCharges, 0) + parsePositiveNumber(quotation.additionalCharges, 0)
        );

        let creditLimitWarning: null | {
          message: string;
          currentDebt: number;
          creditLimit: number;
          availableCredit: number;
          invoiceAmount: number;
          wouldExceedBy: number;
        } = null;

        if (creditLimit > 0) {
          const currentDebt = await getCurrentCustomerDebt(quotation.customer.toString());
          const newDebt = currentDebt + total;
          if (newDebt > creditLimit) {
            creditLimitWarning = {
              message: "This invoice would exceed the customer's credit limit.",
              currentDebt,
              creditLimit,
              availableCredit: Math.max(0, creditLimit - currentDebt),
              invoiceAmount: total,
              wouldExceedBy: newDebt - creditLimit
            };
          }
        }

        if (invoiceStatus === 'sent') {
          for (const item of invoiceItems) {
            if (!item.product) continue;

            const product = await Product.findById(item.product);
            if (!product) continue;
            if (product.isTrackStock === false) continue;

            const availableStock = product.shopStock !== undefined && product.shopStock > 0
              ? product.shopStock
              : (product.stockQuantity || 0);

            if (availableStock < item.baseQuantity) {
              return NextResponse.json(
                {
                  error: 'INSUFFICIENT_STOCK',
                  message: `Insufficient stock for ${product.name}. Available: ${availableStock}, Requested: ${item.baseQuantity}`
                },
                { status: 400 }
              );
            }
          }
        }

        const notesParts = [
          conversionData.notes,
          quotation.notes,
          quotation.customerNotes,
          quotation.shippingCharges > 0 ? `Shipping charges: ${quotation.shippingCharges}` : '',
          quotation.additionalCharges > 0 ? `${quotation.additionalChargesDescription || 'Additional charges'}: ${quotation.additionalCharges}` : ''
        ].filter(Boolean);

        const invoice = await CustomerInvoice.create({
          invoiceNumber,
          invoiceType: 'sale',
          sourceType: 'quotation',
          sourceId: quotation._id,
          sourceNumber: quotation.quotationNumber,
          customer: quotation.customer,
          customerName: quotation.customerName,
          customerPhone: quotation.customerPhone,
          customerAddress: quotation.deliveryAddress || quotation.companyName,
          customerKraPin: quotation.kraPin || customer?.kraPin,
          creditLimit,
          paymentTerms,
          dueDate,
          invoiceDate,
          items: invoiceItems,
          subtotal,
          discount: discountAmount,
          discountType: 'fixed',
          discountAmount,
          tax,
          taxRate: parsePositiveNumber(quotation.taxRate, 16),
          includeInPrice: Boolean(quotation.taxInclusive),
          total,
          amountPaid: 0,
          balanceDue: total,
          status: invoiceStatus,
          branch: quotation.branch,
          createdBy: user.userId,
          createdByName: user.name || user.email,
          notes: notesParts.join('\n') || undefined,
          terms: conversionData.terms || quotation.termsAndConditions,
          payments: []
        });

        quotation.status = 'converted';
        quotation.convertedToType = 'invoice';
        quotation.convertedTo = invoice._id;
        quotation.convertedAt = new Date();
        await quotation.save();

        return NextResponse.json({
          success: true,
          invoice,
          quotation,
          creditLimitWarning,
        });
      }

      case 'cancel':
        quotation.status = 'cancelled';
        quotation.cancelledAt = new Date();
        break;

      case 'mark_viewed':
        if (quotation.status === 'sent') {
          quotation.status = 'viewed';
          quotation.viewedAt = new Date();
        }
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await quotation.save();

    return NextResponse.json({
      success: true,
      quotation,
    });
  } catch (error) {
    console.error('Quotation action error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.includes('duplicate key')) {
      return NextResponse.json(
        { error: 'DUPLICATE_INVOICE_NUMBER', message: 'Invoice number already exists.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}
