import Expo, { ExpoPushTicket } from 'expo-server-sdk';
import Notification from '../models/notificationsModel';
import { UserDocument } from '../models/userModel';
import { AuthRequest } from '../types/express'; // ← swap Request for AuthRequest

const expo = new Expo();

export const sendNotification = async (
  req: AuthRequest, // ← was: req: Request
  message: any,
): Promise<any[] | null> => {
  const targetUserId = (message as UserDocument)?._id
    ? (message as UserDocument)._id
    : req.body?.userId;

  const targetToken: string | undefined =
    (message as UserDocument)?.expoToken ?? req.body?.expoToken;

  if (!targetToken || !Expo.isExpoPushToken(targetToken)) {
    console.warn(`Invalid or missing Expo token — notification skipped`);
    return null;
  }

  const body = getNotificationBody(message);

  const chunks = expo.chunkPushNotifications([
    {
      to: targetToken,
      sound: 'default',
      title: 'New Message',
      body,
      data: typeof message === 'object' ? message : {},
    },
  ]);

  return sendChunks(chunks, req, targetToken, targetUserId, message);
};

const sendChunks = async (
  chunks: any,
  req: AuthRequest, // ← was: req: Request
  targetToken: string,
  userId: any,
  message: object,
): Promise<any[]> => {
  const notifications: any[] = [];

  for (const chunk of chunks) {
    try {
      const response: ExpoPushTicket[] =
        await expo.sendPushNotificationsAsync(chunk);

      const okCount = response.filter((t) => t.status === 'ok').length;
      console.log(`Push sent — ${okCount}/${chunk.length} ok`);

      const notify = await Notification.create({
        expoPushToken: targetToken,
        message,
        userId,
        createdBy: req.user?.userId, // ← now resolves correctly
        status: response[0]?.status ?? 'unknown',
        tokenId: response,
      });

      notifications.push(notify);
    } catch (error) {
      console.error(`Push chunk failed:`, error);
      await new Notification({
        expoPushToken: targetToken,
        message,
        userId,
        status: 'failed',
      }).save();
    }
  }

  return notifications;
};

const getNotificationBody = (message: any): string => {
  if (message?.text && message.text.trim() !== '') return message.text;
  if (Array.isArray(message?.audio) && message.audio.length > 0)
    return 'Audio message';
  if (Array.isArray(message?.video) && message.video.length > 0)
    return 'Video message';
  if (Array.isArray(message?.photo) && message.photo.length > 0)
    return 'Photo message';
  return 'New message received';
};
