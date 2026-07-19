import Expense from '../models/Expense.js';
import Income from '../models/Income.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import { detectAnomaly, calculateBudgetForecast, parseNlpExpense, parseOcrText } from '../aiService.js';
import { jsonDb } from '../utils/jsonDb.js';
import mongoose from 'mongoose';

const isMongoConnected = () => mongoose.connection.readyState === 1;

// @desc    Get all transactions (unified list: expenses + incomes)
// @route   GET /api/transactions
// @access  Private
const getTransactions = asyncHandler(async (req, res) => {
  if (!isMongoConnected()) {
    const transactions = jsonDb.getTransactions(req.userId);
    return res.json(transactions);
  }

  const expenses = await Expense.find({ userId: req.userId });
  const incomes = await Income.find({ userId: req.userId });

  const mappedExpenses = expenses.map(e => ({
    id: e._id.toString(),
    userId: e.userId.toString(),
    description: e.description,
    amount: e.amount,
    category: e.category,
    date: e.date,
    type: 'expense',
    source: e.source,
    createdAt: e.createdAt
  }));

  const mappedIncomes = incomes.map(i => ({
    id: i._id.toString(),
    userId: i.userId.toString(),
    description: i.description,
    amount: i.amount,
    category: i.category,
    date: i.date,
    type: 'income',
    source: i.source,
    createdAt: i.createdAt
  }));

  const transactions = [...mappedExpenses, ...mappedIncomes];

  // Sort by date desc, then by createdAt desc
  transactions.sort((a, b) => {
    const dateDiff = new Date(b.date) - new Date(a.date);
    if (dateDiff !== 0) return dateDiff;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  res.json(transactions);
});

// @desc    Create a new transaction (expense or income)
// @route   POST /api/transactions
// @access  Private
const createTransaction = asyncHandler(async (req, res) => {
  const { description, amount, category, date, type, source } = req.body;

  const txType = type || 'expense';
  const txDate = date || new Date().toISOString().split('T')[0];

  if (!isMongoConnected()) {
    const newTx = jsonDb.addTransaction(req.userId, {
      description,
      amount,
      category: txType === 'income' ? 'Income' : category,
      date: txDate,
      type: txType,
      source: source || 'manual'
    });

    // Compute anomaly state live for this user if it's an expense
    let anomalyResult = { isAnomaly: false, message: '', severity: 'none' };
    if (txType === 'expense') {
      const history = jsonDb.getTransactions(req.userId);
      anomalyResult = detectAnomaly(newTx, history);
    }

    return res.status(201).json({
      transaction: newTx,
      anomaly: anomalyResult
    });
  }

  let newTx;
  if (txType === 'expense') {
    newTx = await Expense.create({
      userId: req.userId,
      description,
      amount: Math.abs(Number(amount)),
      category: category || 'Other',
      date: txDate,
      source: source || 'manual'
    });
  } else {
    newTx = await Income.create({
      userId: req.userId,
      description,
      amount: Math.abs(Number(amount)),
      category: 'Income',
      date: txDate,
      source: source || 'manual'
    });
  }

  const formattedTx = {
    id: newTx._id.toString(),
    userId: newTx.userId.toString(),
    description: newTx.description,
    amount: newTx.amount,
    category: newTx.category,
    date: newTx.date,
    type: txType,
    source: newTx.source,
    createdAt: newTx.createdAt
  };

  // Compute anomaly state live for this user if it is an expense
  let anomalyResult = { isAnomaly: false, message: '', severity: 'none' };
  if (txType === 'expense') {
    const expenses = await Expense.find({ userId: req.userId });
    const mappedExpenses = expenses.map(e => ({
      id: e._id.toString(),
      userId: e.userId.toString(),
      description: e.description,
      amount: e.amount,
      category: e.category,
      date: e.date,
      type: 'expense',
      source: e.source,
      createdAt: e.createdAt
    }));
    
    anomalyResult = detectAnomaly(formattedTx, mappedExpenses);
  }

  res.status(201).json({
    transaction: formattedTx,
    anomaly: anomalyResult
  });
});

// @desc    Delete a transaction (expense or income)
// @route   DELETE /api/transactions/:id
// @access  Private
const deleteTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isMongoConnected()) {
    const success = jsonDb.deleteTransaction(req.userId, id);
    if (success) {
      return res.json({ message: 'Transaction deleted successfully' });
    } else {
      res.status(404);
      throw new Error('Transaction not found');
    }
  }

  // Try deleting from Expense first
  let deleted = await Expense.findOneAndDelete({ _id: id, userId: req.userId });

  // If not found in Expense, try deleting from Income
  if (!deleted) {
    deleted = await Income.findOneAndDelete({ _id: id, userId: req.userId });
  }

  if (deleted) {
    res.json({ message: 'Transaction deleted successfully' });
  } else {
    res.status(404);
    throw new Error('Transaction not found');
  }
});

// --- AI ANALYTICS & LOGGERS CONTROLLERS ---

// @desc    Parse NLP expense query
// @route   POST /api/ai/parse
// @access  Private
const parseAiNlp = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text) {
    res.status(400);
    throw new Error('Text content is required');
  }

  const parsedData = await parseNlpExpense(text);
  res.json(parsedData);
});

// @desc    Parse receipt image OCR text
// @route   POST /api/ai/parse-receipt
// @access  Private
const parseAiOcr = asyncHandler(async (req, res) => {
  const { ocrText } = req.body;
  if (!ocrText) {
    res.status(400);
    throw new Error('ocrText content is required');
  }

  const parsedData = await parseOcrText(ocrText);
  res.json(parsedData);
});

// @desc    Retrieve budget forecasting and anomaly insights
// @route   GET /api/ai/insights
// @access  Private
const getAiInsights = asyncHandler(async (req, res) => {
  if (!isMongoConnected()) {
    const transactions = jsonDb.getTransactions(req.userId);
    const budgets = jsonDb.getBudgets(req.userId);

    // 1. Calculate next month's forecast via Linear Regression
    const forecastResult = calculateBudgetForecast(transactions, budgets);

    // 2. Scan recent transactions (latest 15) for anomalies
    const anomalies = [];
    const recentTx = transactions.slice(0, 15);
    
    recentTx.forEach(tx => {
      if (tx.type === 'expense') {
        const check = detectAnomaly(tx, transactions);
        if (check.isAnomaly) {
          anomalies.push({
            transactionId: tx.id,
            description: tx.description,
            amount: tx.amount,
            category: tx.category,
            date: tx.date,
            message: check.message,
            severity: check.severity
          });
        }
      }
    });

    return res.json({
      forecast: forecastResult,
      anomalies: anomalies.slice(0, 3)
    });
  }

  const user = await User.findById(req.userId);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const expenses = await Expense.find({ userId: req.userId });
  const incomes = await Income.find({ userId: req.userId });

  const mappedExpenses = expenses.map(e => ({
    id: e._id.toString(),
    userId: e.userId.toString(),
    description: e.description,
    amount: e.amount,
    category: e.category,
    date: e.date,
    type: 'expense',
    source: e.source,
    createdAt: e.createdAt
  }));

  const mappedIncomes = incomes.map(i => ({
    id: i._id.toString(),
    userId: i.userId.toString(),
    description: i.description,
    amount: i.amount,
    category: i.category,
    date: i.date,
    type: 'income',
    source: i.source,
    createdAt: i.createdAt
  }));

  const transactions = [...mappedExpenses, ...mappedIncomes];

  // 1. Calculate next month's forecast via Linear Regression
  const forecastResult = calculateBudgetForecast(transactions, user.budgets);

  // 2. Scan recent transactions (latest 15) for anomalies
  const anomalies = [];
  const recentTx = transactions.slice(0, 15);

  recentTx.forEach(tx => {
    if (tx.type === 'expense') {
      const check = detectAnomaly(tx, mappedExpenses);
      if (check.isAnomaly) {
        anomalies.push({
          transactionId: tx.id,
          description: tx.description,
          amount: tx.amount,
          category: tx.category,
          date: tx.date,
          message: check.message,
          severity: check.severity
        });
      }
    }
  });

  res.json({
    forecast: forecastResult,
    anomalies: anomalies.slice(0, 3)
  });
});

export {
  getTransactions,
  createTransaction,
  deleteTransaction,
  parseAiNlp,
  parseAiOcr,
  getAiInsights
};
