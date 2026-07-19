const validateRegister = (req, res, next) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }
  next();
};

const validateTransaction = (req, res, next) => {
  const { description, amount } = req.body;
  if (!description || amount === undefined) {
    return res.status(400).json({ error: 'Description and Amount are required' });
  }
  if (isNaN(amount) || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }
  next();
};

export { validateRegister, validateTransaction };
