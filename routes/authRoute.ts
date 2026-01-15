import express from 'express';

const router = express.Router();

import {
  forgotPassword,
  guestLogin,
  login,
  logout,
  register,
  resendCode,
  resetPassword,
  verifyEmail,
} from '../controller/authController';
import { authenticatedUser } from '../middleware/authenticatedUser';
import { upload } from '../middleware/multerMiddleware';

router.post('/register', upload.single('avatar'), register);
router.post('/verify-email', verifyEmail);
router.post('/login', login);
router.post('/reset-password', resetPassword);
router.post('/forgot-password', forgotPassword);
router.post('/resend-code', resendCode);
router.delete('/logout', authenticatedUser, logout);
router.post('/guest-login', guestLogin);

export default router;
