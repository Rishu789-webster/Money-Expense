import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const budgetSchema = mongoose.Schema({
  category: { type: String, required: true },
  limit: { type: Number, default: 5000 }
});

const userSchema = mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    monthlyAllowance: { type: Number, default: 50000 },
    budgets: {
      type: [budgetSchema],
      default: () => [
        { category: 'Food/Beverage', limit: 8000 },
        { category: 'Transport', limit: 5000 },
        { category: 'Utilities', limit: 12000 },
        { category: 'Entertainment', limit: 4000 },
        { category: 'Shopping', limit: 10000 },
        { category: 'Other', limit: 5000 }
      ]
    }
  },
  { timestamps: true }
);

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Encrypt password using bcrypt before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model('User', userSchema);
export default User;
