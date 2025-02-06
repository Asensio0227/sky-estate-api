import express from 'express';
import {
  createNotifications,
  retrieveNotificationHistory,
} from '../controller/notificationController';

const router = express.Router();

router.route('/').post(createNotifications).get(retrieveNotificationHistory);

export default router;
