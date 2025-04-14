import Expo, { ExpoPushTicket } from 'expo-server-sdk';
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
  const notificationBody = getNotificationBody(message);
  const chunks = expo.chunkPushNotifications([
    {
      to: targetExpoToken,
      sound: 'default',
      title: 'New Message',
      body: notificationBody,
      data: message,
    },
  ]);
  return await sendChunks(chunks, req, user, message);
};

const sendChunks = async (
  chunks: any,
  req: Request,
  user: UserDocument,
  message: object
) => {
  const notifications = [];

  for (const chunk of chunks) {
    console.log(chunk);
    try {
      const response: ExpoPushTicket[] = await expo.sendPushNotificationsAsync(
        chunk
      );
      console.log(
        `Successfully sent push notification to ${chunk.length} devices: ${
          response.filter((ticket) => ticket.status === 'ok').length
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
      console.log(
        `Error sending push notification to chunk: ${chunk.length}`,
        error
      );
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

const getNotificationBody = (message: any): string => {
  if (message?.text && message.text.trim() !== '') {
    return message.text;
  }

  if (Array.isArray(message.audio) && message.audio.length > 0) {
    return '🎵 Audio message';
  }

  if (Array.isArray(message.video) && message.video.length > 0) {
    return '📹 Video message';
  }

  return '📦 New message received';
};
