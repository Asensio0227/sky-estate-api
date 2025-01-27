import express from 'express';

const router = express.Router();

import {
  forgotPassword,
  login,
  logout,
  register,
  resetPassword,
  verifyEmail,
} from '../controller/authController';

router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/login', login);
router.delete('/logout', logout);
router.post('/reset-password', resetPassword);
router.post('/forgot-password', forgotPassword);

export default router;
