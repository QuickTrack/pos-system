import dbConnect from '../src/lib/db/mongodb';
import Product from '../src/models/Product';
import Customer from '../src/models/Customer';
import Supplier from '../src/models/Supplier';
import Sale from '../src/models/Sale';
import Purchase from '../src/models/Purchase';
import CustomerInvoice from '../src/models/CustomerInvoice';
import SupplierInvoice from '../src/models/SupplierInvoice';
import Category from '../src/models/Category';
import Branch from '../src/models/Branch';
import Settings from '../src/models/Settings';

const TRAINING_BRANCH_ID = 'training-branch-001';

async function seedTrainingData() {
  try {
    await dbConnect();
    console.log('Connected to database');

    // Clear existing training data
    await clearTrainingData();

    // Create training branch
    const branch = await createTrainingBranch();
    console.log('Created training branch');

    // Create categories
    const categories = await createCategories();
    console.log('Created categories');

    // Create products
    const products = await createProducts(categories, branch._id.toString());
    console.log('Created products');

    // Create customers
    const customers = await createCustomers(branch._id.toString());
    console.log('Created customers');

    // Create suppliers
    const suppliers = await createSuppliers(branch._id.toString());
    console.log('Created suppliers');

    // Create sales
    const sales = await createSales(products, customers, branch._id.toString());
    console.log('Created sales');

    // Create purchases
    const purchases = await createPurchases(products, suppliers, branch._id.toString());
    console.log('Created purchases');

    // Create customer invoices
    const customerInvoices = await createCustomerInvoices(sales, customers, branch._id.toString());
    console.log('Created customer invoices');

    // Create supplier invoices
    const supplierInvoices = await createSupplierInvoices(purchases, suppliers, branch._id.toString());
    console.log('Created supplier invoices');

    // Create settings
    await createSettings(branch._id.toString());
    console.log('Created settings');

    console.log('Training data seeded successfully!');
    console.log(`Created ${products.length} products, ${customers.length} customers, ${suppliers.length} suppliers`);
    console.log(`Created ${sales.length} sales, ${purchases.length} purchases`);
    console.log(`Created ${customerInvoices.length} customer invoices, ${supplierInvoices.length} supplier invoices`);

  } catch (error) {
    console.error('Error seeding training data:', error);
    throw error;
  }
}

async function clearTrainingData() {
  // Delete all training data
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
}

async function createTrainingBranch() {
  const branch = await Branch.create({
    _id: TRAINING_BRANCH_ID,
    name: 'Training Branch',
    address: '123 Training Street, Nairobi',
    phone: '+254 700 000 000',
    email: 'training@example.com',
    isDefault: true,
    isActive: true,
  });
  return branch;
}

async function createCategories() {
  const categories = await Category.insertMany([
    { name: 'Electronics', description: 'Electronic devices and accessories', branch: TRAINING_BRANCH_ID },
    { name: 'Groceries', description: 'Food and household items', branch: TRAINING_BRANCH_ID },
    { name: 'Clothing', description: 'Apparel and fashion items', branch: TRAINING_BRANCH_ID },
    { name: 'Stationery', description: 'Office and school supplies', branch: TRAINING_BRANCH_ID },
    { name: 'Hardware', description: 'Tools and building materials', branch: TRAINING_BRANCH_ID },
  ]);
  return categories;
}

async function createProducts(categories: any[], branchId: string) {
  const electronics = categories.find(c => c.name === 'Electronics');
  const groceries = categories.find(c => c.name === 'Groceries');
  const clothing = categories.find(c => c.name === 'Clothing');
  const stationery = categories.find(c => c.name === 'Stationery');
  const hardware = categories.find(c => c.name === 'Hardware');

  const products = await Product.insertMany([
    // Electronics
    {
      name: 'Smartphone X',
      sku: 'ELEC-001',
      description: 'Latest smartphone with advanced features',
      category: electronics._id,
      costPrice: 25000,
      retailPrice: 35000,
      wholesalePrice: 32000,
      stockQuantity: 50,
      lowStockThreshold: 10,
      unit: 'piece',
      branch: branchId,
      isActive: true,
    },
    {
      name: 'Laptop Pro',
      sku: 'ELEC-002',
      description: 'High-performance laptop for professionals',
      category: electronics._id,
      costPrice: 80000,
      retailPrice: 120000,
      wholesalePrice: 110000,
      stockQuantity: 20,
      lowStockThreshold: 5,
      unit: 'piece',
      branch: branchId,
      isActive: true,
    },
    {
      name: 'Wireless Earbuds',
      sku: 'ELEC-003',
      description: 'Bluetooth earbuds with noise cancellation',
      category: electronics._id,
      costPrice: 3000,
      retailPrice: 5000,
      wholesalePrice: 4500,
      stockQuantity: 100,
      lowStockThreshold: 20,
      unit: 'piece',
      branch: branchId,
      isActive: true,
    },
    // Groceries
    {
      name: 'Rice (1kg)',
      sku: 'GROC-001',
      description: 'Premium quality rice',
      category: groceries._id,
      costPrice: 120,
      retailPrice: 180,
      wholesalePrice: 160,
      stockQuantity: 500,
      lowStockThreshold: 100,
      unit: 'kg',
      branch: branchId,
      isActive: true,
    },
    {
      name: 'Cooking Oil (1L)',
      sku: 'GROC-002',
      description: 'Vegetable cooking oil',
      category: groceries._id,
      costPrice: 250,
      retailPrice: 350,
      wholesalePrice: 320,
      stockQuantity: 300,
      lowStockThreshold: 50,
      unit: 'liter',
      branch: branchId,
      isActive: true,
    },
    {
      name: 'Sugar (1kg)',
      sku: 'GROC-003',
      description: 'Refined white sugar',
      category: groceries._id,
      costPrice: 150,
      retailPrice: 220,
      wholesalePrice: 200,
      stockQuantity: 400,
      lowStockThreshold: 80,
      unit: 'kg',
      branch: branchId,
      isActive: true,
    },
    // Clothing
    {
      name: 'T-Shirt (Cotton)',
      sku: 'CLO-001',
      description: 'Comfortable cotton t-shirt',
      category: clothing._id,
      costPrice: 500,
      retailPrice: 800,
      wholesalePrice: 700,
      stockQuantity: 200,
      lowStockThreshold: 30,
      unit: 'piece',
      branch: branchId,
      isActive: true,
    },
    {
      name: 'Jeans (Denim)',
      sku: 'CLO-002',
      description: 'Classic denim jeans',
      category: clothing._id,
      costPrice: 1500,
      retailPrice: 2500,
      wholesalePrice: 2200,
      stockQuantity: 150,
      lowStockThreshold: 25,
      unit: 'piece',
      branch: branchId,
      isActive: true,
    },
    // Stationery
    {
      name: 'Notebook (A4)',
      sku: 'STAT-001',
      description: '200-page ruled notebook',
      category: stationery._id,
      costPrice: 150,
      retailPrice: 250,
      wholesalePrice: 220,
      stockQuantity: 1000,
      lowStockThreshold: 200,
      unit: 'piece',
      branch: branchId,
      isActive: true,
    },
    {
      name: 'Ballpoint Pen',
      sku: 'STAT-002',
      description: 'Blue ink ballpoint pen',
      category: stationery._id,
      costPrice: 20,
      retailPrice: 50,
      wholesalePrice: 40,
      stockQuantity: 2000,
      lowStockThreshold: 500,
      unit: 'piece',
      branch: branchId,
      isActive: true,
    },
    // Hardware
    {
      name: 'Hammer',
      sku: 'HARD-001',
      description: 'Steel hammer with wooden handle',
      category: hardware._id,
      costPrice: 800,
      retailPrice: 1200,
      wholesalePrice: 1100,
      stockQuantity: 100,
      lowStockThreshold: 20,
      unit: 'piece',
      branch: branchId,
      isActive: true,
    },
    {
      name: 'Screwdriver Set',
      sku: 'HARD-002',
      description: '10-piece screwdriver set',
      category: hardware._id,
      costPrice: 1200,
      retailPrice: 2000,
      wholesalePrice: 1800,
      stockQuantity: 80,
      lowStockThreshold: 15,
      unit: 'set',
      branch: branchId,
      isActive: true,
    },
  ]);
  return products;
}

async function createCustomers(branchId: string) {
  const customers = await Customer.insertMany([
    {
      name: 'John Kamau',
      phone: '+254 711 111 111',
      email: 'john.kamau@example.com',
      address: '456 Customer Lane, Nairobi',
      type: 'individual',
      creditLimit: 50000,
      branch: branchId,
      isActive: true,
    },
    {
      name: 'Mary Wanjiku',
      phone: '+254 722 222 222',
      email: 'mary.wanjiku@example.com',
      address: '789 Buyer Street, Nairobi',
      type: 'individual',
      creditLimit: 30000,
      branch: branchId,
      isActive: true,
    },
    {
      name: 'Tech Solutions Ltd',
      phone: '+254 733 333 333',
      email: 'info@techsolutions.co.ke',
      address: '101 Business Park, Nairobi',
      type: 'company',
      businessName: 'Tech Solutions Ltd',
      kraPin: 'A123456789B',
      creditLimit: 200000,
      branch: branchId,
      isActive: true,
    },
    {
      name: 'Green Grocers',
      phone: '+254 744 444 444',
      email: 'orders@greengrocers.co.ke',
      address: '202 Market Road, Nairobi',
      type: 'company',
      businessName: 'Green Grocers Ltd',
      kraPin: 'B987654321C',
      creditLimit: 150000,
      branch: branchId,
      isActive: true,
    },
    {
      name: 'Peter Ochieng',
      phone: '+254 755 555 555',
      email: 'peter.ochieng@example.com',
      address: '303 Residential Area, Nairobi',
      type: 'individual',
      creditLimit: 25000,
      branch: branchId,
      isActive: true,
    },
  ]);
  return customers;
}

async function createSuppliers(branchId: string) {
  const suppliers = await Supplier.insertMany([
    {
      name: 'Electronics Wholesale Ltd',
      phone: '+254 766 666 666',
      email: 'sales@electronicswholesale.co.ke',
      address: '404 Industrial Area, Nairobi',
      contactPerson: 'James Mwangi',
      kraPin: 'C111222333D',
      branch: branchId,
      isActive: true,
    },
    {
      name: 'Fresh Foods Distributors',
      phone: '+254 777 777 777',
      email: 'supply@freshfoods.co.ke',
      address: '505 Warehouse Road, Nairobi',
      contactPerson: 'Sarah Njeri',
      kraPin: 'D444555666E',
      branch: branchId,
      isActive: true,
    },
    {
      name: 'Fashion Imports Kenya',
      phone: '+254 788 888 888',
      email: 'orders@fashionimports.co.ke',
      address: '606 Trade Center, Nairobi',
      contactPerson: 'Ali Hassan',
      kraPin: 'E777888999F',
      branch: branchId,
      isActive: true,
    },
    {
      name: 'Office Supplies Co',
      phone: '+254 799 999 999',
      email: 'sales@officesupplies.co.ke',
      address: '707 Commerce Street, Nairobi',
      contactPerson: 'Grace Akinyi',
      kraPin: 'F000111222G',
      branch: branchId,
      isActive: true,
    },
    {
      name: 'Hardware World',
      phone: '+254 700 000 001',
      email: 'info@hardwareworld.co.ke',
      address: '808 Tools Avenue, Nairobi',
      contactPerson: 'David Kipchoge',
      kraPin: 'G333444555H',
      branch: branchId,
      isActive: true,
    },
  ]);
  return suppliers;
}

async function createSales(products: any[], customers: any[], branchId: string) {
  const sales = [];
  const paymentMethods = ['cash', 'mpesa', 'card', 'account'];
  const statuses = ['completed', 'completed', 'completed', 'pending', 'cancelled'];

  // Create 20 sales over the last 30 days
  for (let i = 0; i < 20; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const numItems = Math.floor(Math.random() * 3) + 1;
    const items = [];
    let subtotal = 0;

    for (let j = 0; j < numItems; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 5) + 1;
      const unitPrice = product.retailPrice;
      const total = quantity * unitPrice;
      subtotal += total;

      items.push({
        product: product._id,
        productName: product.name,
        sku: product.sku,
        quantity,
        unitPrice,
        discount: 0,
        tax: 0,
        total,
      });
    }

    const discount = Math.random() > 0.7 ? Math.floor(subtotal * 0.1) : 0;
    const tax = Math.floor((subtotal - discount) * 0.16);
    const total = subtotal - discount + tax;
    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    const saleDate = new Date();
    saleDate.setDate(saleDate.getDate() - Math.floor(Math.random() * 30));

    const sale = await Sale.create({
      invoiceNumber: `INV-${String(i + 1).padStart(5, '0')}`,
      customer: customer._id,
      customerName: customer.name,
      items,
      subtotal,
      discount,
      discountAmount: discount,
      tax,
      total,
      amountPaid: status === 'completed' ? total : 0,
      balance: status === 'completed' ? 0 : total,
      paymentMethod,
      status,
      saleDate,
      branch: branchId,
      createdBy: 'training-user',
    });
    sales.push(sale);
  }
  return sales;
}

async function createPurchases(products: any[], suppliers: any[], branchId: string) {
  const purchases = [];
  const paymentMethods = ['cash', 'bank_transfer', 'mpesa', 'cheque'];
  const statuses = ['received', 'received', 'received', 'pending', 'cancelled'];

  // Create 15 purchases over the last 60 days
  for (let i = 0; i < 15; i++) {
    const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
    const numItems = Math.floor(Math.random() * 3) + 1;
    const items = [];
    let subtotal = 0;

    for (let j = 0; j < numItems; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 20) + 5;
      const unitCost = product.costPrice;
      const total = quantity * unitCost;
      subtotal += total;

      items.push({
        product: product._id,
        productName: product.name,
        sku: product.sku,
        quantity,
        unitCost,
        discount: 0,
        tax: 0,
        total,
      });
    }

    const discount = Math.random() > 0.8 ? Math.floor(subtotal * 0.05) : 0;
    const tax = Math.floor((subtotal - discount) * 0.16);
    const total = subtotal - discount + tax;
    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    const orderDate = new Date();
    orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 60));

    const purchase = await Purchase.create({
      orderNumber: `PO-${String(i + 1).padStart(5, '0')}`,
      supplier: supplier._id,
      supplierName: supplier.name,
      items,
      subtotal,
      discount,
      discountAmount: discount,
      tax,
      total,
      amountPaid: status === 'received' ? total : 0,
      balance: status === 'received' ? 0 : total,
      paymentMethod,
      status,
      orderDate,
      receivedDate: status === 'received' ? orderDate : null,
      branch: branchId,
      createdBy: 'training-user',
    });
    purchases.push(purchase);
  }
  return purchases;
}

async function createCustomerInvoices(sales: any[], customers: any[], branchId: string) {
  const invoices = [];

  // Create invoices for completed sales
  const completedSales = sales.filter(s => s.status === 'completed');
  for (const sale of completedSales) {
    const invoice = await CustomerInvoice.create({
      invoiceNumber: `CINV-${sale.invoiceNumber}`,
      sale: sale._id,
      customer: sale.customer,
      customerName: sale.customerName,
      items: sale.items,
      subtotal: sale.subtotal,
      discount: sale.discount,
      discountAmount: sale.discountAmount,
      tax: sale.tax,
      total: sale.total,
      amountPaid: sale.amountPaid,
      balance: sale.balance,
      status: sale.balance === 0 ? 'paid' : 'pending',
      invoiceDate: sale.saleDate,
      dueDate: new Date(sale.saleDate.getTime() + 30 * 24 * 60 * 60 * 1000),
      branch: branchId,
      createdBy: 'training-user',
    });
    invoices.push(invoice);
  }
  return invoices;
}

async function createSupplierInvoices(purchases: any[], suppliers: any[], branchId: string) {
  const invoices = [];

  // Create invoices for received purchases
  const receivedPurchases = purchases.filter(p => p.status === 'received');
  for (const purchase of receivedPurchases) {
    const invoice = await SupplierInvoice.create({
      invoiceNumber: `SINV-${purchase.orderNumber}`,
      purchase: purchase._id,
      supplier: purchase.supplier,
      supplierName: purchase.supplierName,
      items: purchase.items,
      subtotal: purchase.subtotal,
      discount: purchase.discount,
      discountAmount: purchase.discountAmount,
      tax: purchase.tax,
      total: purchase.total,
      amountPaid: purchase.amountPaid,
      balance: purchase.balance,
      status: purchase.balance === 0 ? 'paid' : 'pending',
      invoiceDate: purchase.orderDate,
      dueDate: new Date(purchase.orderDate.getTime() + 30 * 24 * 60 * 60 * 1000),
      branch: branchId,
      createdBy: 'training-user',
    });
    invoices.push(invoice);
  }
  return invoices;
}

async function createSettings(branchId: string) {
  await Settings.create({
    businessName: 'Training Business Ltd',
    businessPhone: '+254 700 000 000',
    businessEmail: 'info@trainingbusiness.co.ke',
    businessAddress: '123 Training Street, Nairobi',
    currency: 'KES',
    taxRate: 16,
    taxEnabled: true,
    invoicePrefix: 'TRAIN',
    receiptPrefix: 'RCP',
    lowStockThreshold: 10,
    allowNegativeStock: false,
    branch: branchId,
  });
}

// Run the seeder
seedTrainingData()
  .then(() => {
    console.log('Training data seeding completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Training data seeding failed:', error);
    process.exit(1);
  });
