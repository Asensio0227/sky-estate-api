import express from 'express';
import {
  approveRealtorApplication,
  applyForRealtor,
  getAllRealtorApplications,
  getMyRealtorStatus,
  rejectRealtorApplication,
} from '../controller/realtorController';
import { authorizedPermissions } from '../middleware/authenticatedUser';
import { upload } from '../middleware/multerMiddleware';

const router = express.Router();

// ── User routes ──────────────────────────────────────────────────────────────

// POST /api/v1/realtor/apply  — any authenticated user/member can apply
router.post('/apply', upload.array('documents', 5), applyForRealtor);

// GET /api/v1/realtor/status  — get own application status
router.get('/status', getMyRealtorStatus);

// ── Admin routes ─────────────────────────────────────────────────────────────

// GET /api/v1/realtor/applications  — list all applications (filter by ?status=)
router.get(
  '/applications',
  authorizedPermissions('admin', 'super-admin'),
  getAllRealtorApplications,
);

// PATCH /api/v1/realtor/:userId/approve
router.patch(
  '/:userId/approve',
  authorizedPermissions('admin', 'super-admin'),
  approveRealtorApplication,
);

// PATCH /api/v1/realtor/:userId/reject
router.patch(
  '/:userId/reject',
  authorizedPermissions('admin', 'super-admin'),
  rejectRealtorApplication,
);

export default router;
