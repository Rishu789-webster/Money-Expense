import mongoose from 'mongoose';

const expenseSchema = mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { type: String, required: true, default: 'Other' },
    date: { type: String, required: true }, // Format YYYY-MM-DD
    source: { type: String, default: 'manual' } // 'manual' | 'ocr' | 'nlp'
  },
  { timestamps: true }
);

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;
