import express from 'express';

const router = express.Router();

import {
  forgotPassword,
  login,
  logout,
  register,
  resendCode,
  resetPassword,
  verifyEmail,
} from '../controller/authController';
import { authenticatedUser } from '../middleware/authenticatedUser';

router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/login', login);
router.post('/reset-password', resetPassword);
router.post('/forgot-password', forgotPassword);
router.post('/resend-code', resendCode);
router.delete('/logout', authenticatedUser, logout);

export default router;
