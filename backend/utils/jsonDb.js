import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Save to backend/data/db.json relative to the root backend dir
const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

// Ensure directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Password hashing utility
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

class JsonDatabase {
  constructor() {
    this.init();
  }

  init() {
    if (!fs.existsSync(DB_PATH)) {
      this.write({
        users: [],
        transactions: [],
        budgets: []
      });
      this.seedMockData();
    }
  }

  read() {
    try {
      if (!fs.existsSync(DB_PATH)) {
        this.init();
      }
      const data = fs.readFileSync(DB_PATH, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading database file, returning default schema:', error);
      return { users: [], transactions: [], budgets: [] };
    }
  }

  write(data) {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error('Error writing to database file:', error);
      return false;
    }
  }

  seedMockData() {
    const data = this.read();
    
    const defaultUser = {
      id: 'user_1',
      username: 'rishabh',
      password: hashPassword('password123'),
      email: 'rishabh@example.com',
      monthlyAllowance: 50000,
      createdAt: new Date().toISOString()
    };
    data.users = [defaultUser];

    const categories = ['Food/Beverage', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Other'];
    const defaultLimits = {
      'Food/Beverage': 8000,
      'Transport': 5000,
      'Utilities': 12000,
      'Entertainment': 4000,
      'Shopping': 10000,
      'Other': 5000
    };

    data.budgets = categories.map(cat => ({
      userId: 'user_1',
      category: cat,
      limit: defaultLimits[cat]
    }));

    const transactions = [];
    const monthlySpendingPattern = [
      { month: 2, name: 'March', year: 2026 },
      { month: 3, name: 'April', year: 2026 },
      { month: 4, name: 'May', year: 2026 }
    ];

    let idCounter = 1;

    const createTx = (description, amount, category, dateStr, source = 'manual') => ({
      id: `tx_${idCounter++}`,
      userId: 'user_1',
      description,
      amount: Number(amount),
      category,
      date: dateStr,
      type: 'expense',
      source,
      createdAt: new Date(dateStr).toISOString()
    });

    monthlySpendingPattern.forEach(({ month, year }) => {
      const pad = (n) => String(n).padStart(2, '0');
      transactions.push(createTx('Rent Payment', 7500, 'Utilities', `${year}-${pad(month+1)}-02`));
      transactions.push(createTx('Electricity Bill', 2200, 'Utilities', `${year}-${pad(month+1)}-10`));
      transactions.push(createTx('WiFi Subscription', 899, 'Utilities', `${year}-${pad(month+1)}-15`));

      transactions.push(createTx('Groceries Supermarket', 1800, 'Food/Beverage', `${year}-${pad(month+1)}-05`));
      transactions.push(createTx('Cafe Coffee & Snacks', 350, 'Food/Beverage', `${year}-${pad(month+1)}-07`));
      transactions.push(createTx('Swiggy Dinner Delivery', 650, 'Food/Beverage', `${year}-${pad(month+1)}-12`));
      transactions.push(createTx('Weekly Veggie Store', 900, 'Food/Beverage', `${year}-${pad(month+1)}-19`));
      transactions.push(createTx('Restaurant Dineout', 1200, 'Food/Beverage', `${year}-${pad(month+1)}-24`));

      transactions.push(createTx('Uber Ride to Office', 450, 'Transport', `${year}-${pad(month+1)}-04`));
      transactions.push(createTx('Petrol Pump Refuel', 1500, 'Transport', `${year}-${pad(month+1)}-14`));
      transactions.push(createTx('Metro Smartcard Recharge', 500, 'Transport', `${year}-${pad(month+1)}-21`));

      transactions.push(createTx('Netflix Premium', 649, 'Entertainment', `${year}-${pad(month+1)}-01`));
      transactions.push(createTx('Movie Tickets & Popcorn', 850, 'Entertainment', `${year}-${pad(month+1)}-18`));

      transactions.push(createTx('Amazon Brand Clothes', 2400, 'Shopping', `${year}-${pad(month+1)}-11`));
      transactions.push(createTx('Book Store Purchase', 850, 'Shopping', `${year}-${pad(month+1)}-27`));

      transactions.push(createTx('Medical Pharmacy', 400, 'Other', `${year}-${pad(month+1)}-08`));
      transactions.push(createTx('Laundry Dry Clean', 300, 'Other', `${year}-${pad(month+1)}-22`));
    });

    const pad = (n) => String(n).padStart(2, '0');
    const curYear = 2026;
    const curMonth = 5;
    transactions.push(createTx('Netflix Premium', 649, 'Entertainment', `${curYear}-${pad(curMonth+1)}-01`));
    transactions.push(createTx('Rent Payment', 7500, 'Utilities', `${curYear}-${pad(curMonth+1)}-02`));
    transactions.push(createTx('Groceries Supermarket', 1950, 'Food/Beverage', `${curYear}-${pad(curMonth+1)}-03`));

    data.transactions = transactions;
    this.write(data);
  }

  registerUser(username, email, password) {
    const data = this.read();
    const normalizedUsername = username.toLowerCase().trim();
    
    const exists = data.users.some(u => u.username.toLowerCase() === normalizedUsername);
    if (exists) {
      return { error: 'Username is already taken' };
    }

    const userId = `user_${Date.now()}`;
    const newUser = {
      id: userId,
      username: username.trim(),
      password: hashPassword(password),
      email: email.trim(),
      monthlyAllowance: 30000,
      createdAt: new Date().toISOString()
    };

    data.users.push(newUser);

    const categories = ['Food/Beverage', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Other'];
    categories.forEach(cat => {
      data.budgets.push({
        userId: userId,
        category: cat,
        limit: 5000
      });
    });

    this.write(data);

    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  loginUser(username, password) {
    const data = this.read();
    const normalizedUsername = username.toLowerCase().trim();
    const hash = hashPassword(password);

    const user = data.users.find(u => u.username.toLowerCase() === normalizedUsername && u.password === hash);
    if (!user) {
      return { error: 'Invalid username or password' };
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  updateProfile(userId, email, monthlyAllowance) {
    const data = this.read();
    const userIndex = data.users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return { error: 'User not found' };
    }

    if (email) data.users[userIndex].email = email.trim();
    if (monthlyAllowance !== undefined) data.users[userIndex].monthlyAllowance = Number(monthlyAllowance);

    this.write(data);

    const { password: _, ...userWithoutPassword } = data.users[userIndex];
    return userWithoutPassword;
  }

  getTransactions(userId) {
    const data = this.read();
    const userTxs = data.transactions.filter(tx => tx.userId === userId);
    return userTxs.sort((a, b) => {
      const dateDiff = new Date(b.date) - new Date(a.date);
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }

  addTransaction(userId, tx) {
    const data = this.read();
    const newTx = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId: userId,
      description: tx.description || 'Untitled Transaction',
      amount: Math.abs(Number(tx.amount)) || 0,
      category: tx.category || 'Other',
      date: tx.date || new Date().toISOString().split('T')[0],
      type: tx.type || 'expense',
      source: tx.source || 'manual',
      createdAt: new Date().toISOString()
    };
    data.transactions.push(newTx);
    this.write(data);
    return newTx;
  }

  deleteTransaction(userId, id) {
    const data = this.read();
    const initialLength = data.transactions.length;
    data.transactions = data.transactions.filter(tx => !(tx.id === id && tx.userId === userId));
    this.write(data);
    return data.transactions.length < initialLength;
  }

  getBudgets(userId) {
    const data = this.read();
    const userBudgets = data.budgets.filter(b => b.userId === userId);
    
    if (userBudgets.length === 0) {
      const categories = ['Food/Beverage', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Other'];
      const defaultBudgets = categories.map(cat => ({
        userId,
        category: cat,
        limit: 5000
      }));
      data.budgets.push(...defaultBudgets);
      this.write(data);
      return defaultBudgets;
    }
    return userBudgets;
  }

  updateBudget(userId, category, limit) {
    const data = this.read();
    const budgetIndex = data.budgets.findIndex(b => b.userId === userId && b.category === category);
    
    if (budgetIndex !== -1) {
      data.budgets[budgetIndex].limit = Number(limit);
    } else {
      data.budgets.push({ userId, category, limit: Number(limit) });
    }
    
    this.write(data);
    return this.getBudgets(userId);
  }
}

export const jsonDb = new JsonDatabase();
export { hashPassword };
