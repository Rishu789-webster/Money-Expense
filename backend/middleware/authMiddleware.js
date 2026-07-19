import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import { jsonDb } from '../utils/jsonDb.js';
import mongoose from 'mongoose';

const isMongoConnected = () => mongoose.connection.readyState === 1;

const protect = asyncHandler(async (req, res, next) => {
  let token;

  // 1. Check for Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'aura_secret_key_123_456');
      req.userId = decoded.id;
      
      if (isMongoConnected()) {
        req.user = await User.findById(decoded.id).select('-password');
      } else {
        // Fallback JSON DB lookup
        const data = jsonDb.read();
        const user = data.users.find(u => u.id === decoded.id);
        if (user) {
          const { password, ...userWithoutPassword } = user;
          req.user = userWithoutPassword;
        }
      }
      return next();
    } catch (error) {
      console.error('JWT verification error:', error.message);
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  }

  // 2. Fallback to x-user-id header
  const userIdHeader = req.headers['x-user-id'];
  if (userIdHeader) {
    req.userId = userIdHeader;
    
    if (isMongoConnected()) {
      if (userIdHeader === 'user_1') {
        const demoUser = await User.findOne({ username: 'rishabh' });
        if (demoUser) {
          req.userId = demoUser._id.toString();
          req.user = demoUser;
          return next();
        }
      } else {
        try {
          req.user = await User.findById(userIdHeader).select('-password');
          if (req.user) {
            req.userId = req.user._id.toString();
            return next();
          }
        } catch (err) {
          // Ignore and check below
        }
      }
    } else {
      // Fallback JSON DB lookup
      const data = jsonDb.read();
      const user = data.users.find(u => u.id === userIdHeader);
      if (user) {
        const { password, ...userWithoutPassword } = user;
        req.user = userWithoutPassword;
        req.userId = user.id;
        return next();
      }
    }
  }

  res.status(401);
  throw new Error('Not authorized, token or user id missing');
});

export { protect };
