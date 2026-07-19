import Income from '../models/Income.js';
import asyncHandler from '../utils/asyncHandler.js';
import { jsonDb } from '../utils/jsonDb.js';
import mongoose from 'mongoose';

const isMongoConnected = () => mongoose.connection.readyState === 1;

// @desc    Get all incomes
// @route   GET /api/incomes
// @access  Private
const getIncomes = asyncHandler(async (req, res) => {
  if (!isMongoConnected()) {
    const transactions = jsonDb.getTransactions(req.userId);
    const incomes = transactions.filter(tx => tx.type === 'income');
    return res.json(incomes);
  }

  const incomes = await Income.find({ userId: req.userId }).sort({ date: -1, createdAt: -1 });
  res.json(incomes);
});

// @desc    Create a new income
// @route   POST /api/incomes
// @access  Private
const createIncome = asyncHandler(async (req, res) => {
  const { description, amount, date, source } = req.body;

  if (!description || amount === undefined) {
    res.status(400);
    throw new Error('Description and Amount are required');
  }

  if (!isMongoConnected()) {
    const income = jsonDb.addTransaction(req.userId, {
      description,
      amount,
      category: 'Income',
      date: date || new Date().toISOString().split('T')[0],
      type: 'income',
      source: source || 'manual'
    });
    return res.status(201).json(income);
  }

  const income = await Income.create({
    userId: req.userId,
    description,
    amount: Math.abs(Number(amount)),
    category: 'Income',
    date: date || new Date().toISOString().split('T')[0],
    source: source || 'manual'
  });

  res.status(201).json(income);
});

// @desc    Delete an income
// @route   DELETE /api/incomes/:id
// @access  Private
const deleteIncome = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isMongoConnected()) {
    const success = jsonDb.deleteTransaction(req.userId, id);
    if (success) {
      return res.json({ message: 'Income deleted successfully' });
    } else {
      res.status(404);
      throw new Error('Income not found');
    }
  }

  const deleted = await Income.findOneAndDelete({ _id: id, userId: req.userId });

  if (deleted) {
    res.json({ message: 'Income deleted successfully' });
  } else {
    res.status(404);
    throw new Error('Income not found');
  }
});

export { getIncomes, createIncome, deleteIncome };
