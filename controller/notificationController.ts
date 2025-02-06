import Expo from 'expo-server-sdk';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { BadRequestError, UnauthorizedError } from '../errors/custom';
import Notification from '../models/notificationsModel';
import User, { UserDocument } from '../models/userModel';
import { queryFilters } from '../utils/global';
import { sendNotification } from '../utils/pushToken';

export const createNotifications = async (req: Request, res: Response) => {
  const user: UserDocument | any = await User.findOne({ _id: req.body.userId });

  if (!Expo.isExpoPushToken(user?.expoToken))
    throw new UnauthorizedError('Invalid Expo token.');

  const result = await sendNotification(req, user);
  res.status(StatusCodes.CREATED).json({ result });
};

export const retrieveNotificationHistory = async (
  req: Request,
  res: Response
) => {
  const { page, skip, limit } = queryFilters(req);
  const notifications = await Notification.find({ userId: req.user?.userId })
    .sort('-createdAt')
    .limit(limit)
    .skip(skip)
    .populate([
      {
        path: 'userId',
        select: 'username email status avatar expoToken',
      },
      {
        path: 'createdBy',
        select: 'username email status avatar expoToken',
      },
    ]);
  const totalNotifications = await Notification.countDocuments({
    userId: req.user?.userId,
  });
  const numOfPages = Math.ceil(totalNotifications / limit);

  for (const notify of notifications) {
    if (!Expo.isExpoPushToken(notify.expoPushToken)) {
      throw new BadRequestError('Invalid Expo push token');
    }
  }

  res
    .status(StatusCodes.CREATED)
    .json({ notifications, totalNotifications, numOfPages });
};
