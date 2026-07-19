import express from 'express';
import { registerUser, authUser, updateUserProfile } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateRegister } from '../middleware/validateMiddleware.js';

const router = express.Router();

router.post('/register', validateRegister, registerUser);
router.post('/login', authUser);
router.put('/profile', protect, updateUserProfile);

export default router;
