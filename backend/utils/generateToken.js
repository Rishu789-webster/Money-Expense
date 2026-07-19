import jwt from 'jsonwebtoken';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'aura_secret_key_123_456', {
    expiresIn: '30d',
  });
};

export default generateToken;
