import express from 'express';
import {
  getTransactions,
  createTransaction,
  deleteTransaction,
  parseAiNlp,
  parseAiOcr,
  getAiInsights
} from '../controllers/expenseController.js';
import { getUserBudgets, updateUserBudget } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateTransaction } from '../middleware/validateMiddleware.js';

const router = express.Router();

// Transaction routes (Unified: both Expense & Income)
router.route('/transactions')
  .get(protect, getTransactions)
  .post(protect, validateTransaction, createTransaction);

router.route('/transactions/:id')
  .delete(protect, deleteTransaction);

// Budget routes
router.route('/budgets')
  .get(protect, getUserBudgets)
  .put(protect, updateUserBudget);

// AI & Analytics routes
router.post('/ai/parse', protect, parseAiNlp);
router.post('/ai/parse-receipt', protect, parseAiOcr);
router.get('/ai/insights', protect, getAiInsights);

export default router;
