import mongoose from 'mongoose';
import User from '../models/User.js';
import Expense from '../models/Expense.js';
import Income from '../models/Income.js';
import bcrypt from 'bcryptjs';

const seedDatabase = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('📂 Database already has data. Skipping seeding.');
      return;
    }

    console.log('📂 Seeding database with default developer account and mock transaction history...');

    // Create default user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    const defaultUser = await User.create({
      username: 'rishabh',
      email: 'rishabh@example.com',
      password: hashedPassword,
      monthlyAllowance: 50000,
      budgets: [
        { category: 'Food/Beverage', limit: 8000 },
        { category: 'Transport', limit: 5000 },
        { category: 'Utilities', limit: 12000 },
        { category: 'Entertainment', limit: 4000 },
        { category: 'Shopping', limit: 10000 },
        { category: 'Other', limit: 5000 }
      ]
    });

    const userId = defaultUser._id;

    // Generate historical transactions
    const transactions = [];
    const monthlySpendingPattern = [
      { month: 2, name: 'March', year: 2026 },
      { month: 3, name: 'April', year: 2026 },
      { month: 4, name: 'May', year: 2026 }
    ];

    const createTx = (description, amount, category, dateStr, source = 'manual') => ({
      userId,
      description,
      amount: Number(amount),
      category,
      date: dateStr,
      source,
      createdAt: new Date(dateStr)
    });

    monthlySpendingPattern.forEach(({ month, year }) => {
      const pad = (n) => String(n).padStart(2, '0');
      // Utilities (Fixed costs)
      transactions.push(createTx('Rent Payment', 7500, 'Utilities', `${year}-${pad(month+1)}-02`));
      transactions.push(createTx('Electricity Bill', 2200, 'Utilities', `${year}-${pad(month+1)}-10`));
      transactions.push(createTx('WiFi Subscription', 899, 'Utilities', `${year}-${pad(month+1)}-15`));

      // Food (Multiple small transactions)
      transactions.push(createTx('Groceries Supermarket', 1800, 'Food/Beverage', `${year}-${pad(month+1)}-05`));
      transactions.push(createTx('Cafe Coffee & Snacks', 350, 'Food/Beverage', `${year}-${pad(month+1)}-07`));
      transactions.push(createTx('Swiggy Dinner Delivery', 650, 'Food/Beverage', `${year}-${pad(month+1)}-12`));
      transactions.push(createTx('Weekly Veggie Store', 900, 'Food/Beverage', `${year}-${pad(month+1)}-19`));
      transactions.push(createTx('Restaurant Dineout', 1200, 'Food/Beverage', `${year}-${pad(month+1)}-24`));

      // Transport
      transactions.push(createTx('Uber Ride to Office', 450, 'Transport', `${year}-${pad(month+1)}-04`));
      transactions.push(createTx('Petrol Pump Refuel', 1500, 'Transport', `${year}-${pad(month+1)}-14`));
      transactions.push(createTx('Metro Smartcard Recharge', 500, 'Transport', `${year}-${pad(month+1)}-21`));

      // Entertainment
      transactions.push(createTx('Netflix Premium', 649, 'Entertainment', `${year}-${pad(month+1)}-01`));
      transactions.push(createTx('Movie Tickets & Popcorn', 850, 'Entertainment', `${year}-${pad(month+1)}-18`));

      // Shopping
      transactions.push(createTx('Amazon Brand Clothes', 2400, 'Shopping', `${year}-${pad(month+1)}-11`));
      transactions.push(createTx('Book Store Purchase', 850, 'Shopping', `${year}-${pad(month+1)}-27`));

      // Other
      transactions.push(createTx('Medical Pharmacy', 400, 'Other', `${year}-${pad(month+1)}-08`));
      transactions.push(createTx('Laundry Dry Clean', 300, 'Other', `${year}-${pad(month+1)}-22`));
    });

    // June 2026 transactions
    const pad = (n) => String(n).padStart(2, '0');
    const curYear = 2026;
    const curMonth = 5;
    transactions.push(createTx('Netflix Premium', 649, 'Entertainment', `${curYear}-${pad(curMonth+1)}-01`));
    transactions.push(createTx('Rent Payment', 7500, 'Utilities', `${curYear}-${pad(curMonth+1)}-02`));
    transactions.push(createTx('Groceries Supermarket', 1950, 'Food/Beverage', `${curYear}-${pad(curMonth+1)}-03`));

    // Insert into Expense
    await Expense.insertMany(transactions);
    console.log('📂 Database seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aura_expense', {
      serverSelectionTimeoutMS: 2000 // Timeout quickly if MongoDB is not running
    });
    console.log(`🚀 MongoDB Connected: ${conn.connection.host}`);
    
    // Seed mock data if needed
    await seedDatabase();
  } catch (error) {
    console.warn(`⚠️ Local MongoDB connection failed: ${error.message}`);
    console.warn(`📂 Falling back to local file-based database (backend/data/db.json).`);
  }
};

export default connectDB;
