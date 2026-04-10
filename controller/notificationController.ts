import Expo from 'expo-server-sdk';
import { Response } from 'express';
import { AuthRequest } from '../types/express';
import { StatusCodes } from 'http-status-codes';
import { UnauthorizedError } from '../errors/custom';
import Notification from '../models/notificationsModel';
import User, { UserDocument } from '../models/userModel';
import { queryFilters } from '../utils/global';
import { sendNotification } from '../utils/pushToken';

export const createNotifications = async (req: AuthRequest, res: Response) => {
  const user: UserDocument | null = await User.findById(req.body.userId);

  if (!user) {
    throw new UnauthorizedError('User not found.');
  }

  // Skip gracefully when no valid token — never crash
  if (!user.expoToken || !Expo.isExpoPushToken(user.expoToken)) {
    console.warn(`No valid Expo token for user: ${user.email}`);
    return res.status(StatusCodes.OK).json({
      result: null,
      msg: 'Notification skipped — no valid push token',
    });
  }

  const result = await sendNotification(req, user);
  res.status(StatusCodes.CREATED).json({ result });
};

// ─── retrieveNotificationHistory ─────────────────────────────────────────────

export const retrieveNotificationHistory = async (
  req: AuthRequest,
  res: Response,
) => {
  const { page, skip, limit } = queryFilters(req);

  const notifications = await Notification.find({ userId: req.user?.userId })
    .sort('-createdAt')
    .limit(limit)
    .skip(skip)
    .populate([
      { path: 'userId',    select: 'username email status avatar expoToken' },
      { path: 'createdBy', select: 'username email status avatar expoToken' },
    ]);

  const totalNotifications = await Notification.countDocuments({
    userId: req.user?.userId,
  });
  const numOfPages = Math.ceil(totalNotifications / limit);

  // FIX #10 — return validNotifications, not the unfiltered array
  const validNotifications = notifications.filter((notify) => {
    const isValid = Expo.isExpoPushToken(notify.expoPushToken);
    if (!isValid)
      console.warn(`Skipping invalid token: ${notify.expoPushToken}`);
    return isValid;
  });

  res.status(StatusCodes.OK).json({
    notifications: validNotifications,   // was returning unfiltered `notifications`
    totalNotifications,
    numOfPages,
    page,
  });
};
