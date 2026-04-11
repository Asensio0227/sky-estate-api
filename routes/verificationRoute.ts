import express from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { authorizedPermissions } from '../middleware/authenticatedUser';
import {
  approveIdVerification,
  getMyVerificationStatus,
  getPendingIdVerifications,
  rejectIdVerification,
  submitIdVerification,
} from '../controller/verificationController';

const router = express.Router();

// ─── Rate limiter (tight — prevents document-upload spam) ─────────────────────
// 5 submissions per hour per IP.
const verifyIdLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many verification attempts. Please try again in an hour.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Multer: memory storage, max 5 files total, 10 MB per file
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 5,              // hard cap — 2 expected (document + selfie), 5 guards edge cases
    fileSize: 10 * 1024 * 1024, // 10 MB per file
  },
});

// ─── User routes ──────────────────────────────────────────────────────────────

// POST /api/v1/verify/id
// Expects multipart/form-data with fields: idNumber (text), document (file), selfie (file)
router.post(
  '/id',
  verifyIdLimiter,
  upload.fields([
    { name: 'document', maxCount: 1 },
    { name: 'selfie',   maxCount: 1 },
  ]),
  submitIdVerification,
);

// GET /api/v1/verify/id/status
router.get('/id/status', getMyVerificationStatus);

// ─── Admin routes ─────────────────────────────────────────────────────────────

// GET /api/v1/verify/admin/id-verifications?status=pending
router.get(
  '/admin/id-verifications',
  authorizedPermissions('admin', 'super-admin'),
  getPendingIdVerifications,
);

// PATCH /api/v1/verify/admin/id-verification/:userId/approve
router.patch(
  '/admin/id-verification/:userId/approve',
  authorizedPermissions('admin', 'super-admin'),
  approveIdVerification,
);

// PATCH /api/v1/verify/admin/id-verification/:userId/reject
// Body: { reason: string }
router.patch(
  '/admin/id-verification/:userId/reject',
  authorizedPermissions('admin', 'super-admin'),
  rejectIdVerification,
);

export default router;
