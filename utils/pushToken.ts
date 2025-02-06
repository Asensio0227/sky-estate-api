import Expo from 'expo-server-sdk';
import { Request } from 'express';
import { BadRequestError } from '../errors/custom';
import Notification from '../models/notificationsModel';
import { UserDocument } from '../models/userModel';

const expo = new Expo();

export const sendNotification = async (req: Request, user: UserDocument) => {
  const { message } = req.body;
  const targetExpoToken = user.expoToken;

  if (!Expo.isExpoPushToken(targetExpoToken)) {
    throw new BadRequestError(`Invalid Expo token: ${targetExpoToken}`);
  }

  const chunks = expo.chunkPushNotifications([
    { to: targetExpoToken, sound: 'default', body: message },
  ]);
  return await sendChunks(chunks, req, user);
};

const sendChunks = async (chunks: any, req: Request, user: UserDocument) => {
  const { message } = req.body;
  const notifications = [];

  for (const chunk of chunks) {
    try {
      const response: any = await expo.sendPushNotificationsAsync(chunk);
      console.log(
        `Successfully sent push notification to ${chunk.length} devices: ${
          response.results.filter((r: any) => !r.error).length
        }`
      );
      const notify = await Notification.create({
        expoPushToken: user.expoToken || chunk[0].to,
        message,
        userId: user._id,
        createdBy: req.user?.userId,
        status: response[0].status,
        tokenId: response,
      });
      notifications.push(notify);
    } catch (error) {
      console.log(`Error sending push notification to chunk: ${chunk.length}`);
      const failedNotification = new Notification({
        expoPushToken: chunk[0].to,
        message,
        status: 'failed',
      });
      await failedNotification.save();
    }
  }
  return notifications;
};
