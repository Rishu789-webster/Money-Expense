import asyncHandler from '../utils/asyncHandler.js';
import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import { jsonDb } from '../utils/jsonDb.js';
import mongoose from 'mongoose';

const isMongoConnected = () => mongoose.connection.readyState === 1;

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!isMongoConnected()) {
    const result = jsonDb.registerUser(username, email, password);
    if (result.error) {
      res.status(400);
      throw new Error(result.error);
    }
    return res.status(201).json(result);
  }

  const normalizedUsername = username.toLowerCase().trim();
  const normalizedEmail = email.toLowerCase().trim();

  const userExists = await User.findOne({
    $or: [{ username: normalizedUsername }, { email: normalizedEmail }]
  });

  if (userExists) {
    res.status(400);
    throw new Error('Username or email already exists');
  }

  const user = await User.create({
    username: username.trim(),
    email: email.trim(),
    password
  });

  if (user) {
    res.status(201).json({
      id: user._id,
      username: user.username,
      email: user.email,
      monthlyAllowance: user.monthlyAllowance,
      token: generateToken(user._id)
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const authUser = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!isMongoConnected()) {
    const result = jsonDb.loginUser(username, password);
    if (result.error) {
      res.status(400);
      throw new Error(result.error);
    }
    return res.json(result);
  }

  const user = await User.findOne({ username: username.toLowerCase().trim() });

  if (user && (await user.matchPassword(password))) {
    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      monthlyAllowance: user.monthlyAllowance,
      token: generateToken(user._id)
    });
  } else {
    res.status(401);
    throw new Error('Invalid username or password');
  }
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const { email, monthlyAllowance } = req.body;

  if (!isMongoConnected()) {
    const result = jsonDb.updateProfile(req.userId, email, monthlyAllowance);
    if (result.error) {
      res.status(400);
      throw new Error(result.error);
    }
    return res.json(result);
  }

  const user = await User.findById(req.userId);

  if (user) {
    if (email) {
      user.email = email.trim();
    }
    if (monthlyAllowance !== undefined) {
      user.monthlyAllowance = Number(monthlyAllowance);
    }

    const updatedUser = await user.save();

    res.json({
      id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      monthlyAllowance: updatedUser.monthlyAllowance,
      token: generateToken(updatedUser._id)
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Get user budgets
// @route   GET /api/budgets
// @access  Private
const getUserBudgets = asyncHandler(async (req, res) => {
  if (!isMongoConnected()) {
    const budgets = jsonDb.getBudgets(req.userId);
    return res.json(budgets);
  }

  const user = await User.findById(req.userId);
  if (user) {
    res.json(user.budgets);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Update user budget
// @route   PUT /api/budgets
// @access  Private
const updateUserBudget = asyncHandler(async (req, res) => {
  const { category, limit } = req.body;
  if (!category || limit === undefined) {
    res.status(400);
    throw new Error('Category and Limit are required');
  }

  if (!isMongoConnected()) {
    const budgets = jsonDb.updateBudget(req.userId, category, limit);
    return res.json(budgets);
  }

  const user = await User.findById(req.userId);
  if (user) {
    const budgetIndex = user.budgets.findIndex(b => b.category === category);
    if (budgetIndex !== -1) {
      user.budgets[budgetIndex].limit = Number(limit);
    } else {
      user.budgets.push({ category, limit: Number(limit) });
    }
    await user.save();
    res.json(user.budgets);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

export { registerUser, authUser, updateUserProfile, getUserBudgets, updateUserBudget };
