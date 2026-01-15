// routes/notificationsRoute.ts
import express from 'express';
const router = express.Router();

import {
  createNotifications,
  retrieveNotificationHistory,
} from '../controller/notificationController';
import { testingUser } from '../middleware/testingUser'; // Import

// READ operations
router.get('/', retrieveNotificationHistory);

// WRITE operations - Protected from guest user
router.post('/', testingUser, createNotifications);

export default router;
