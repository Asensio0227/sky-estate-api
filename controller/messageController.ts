import { v2 as cloudinary } from 'cloudinary';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { NotFoundError, UnauthorizedError } from '../errors/custom';
import Message from '../models/messageModel';
import Room from '../models/roomModel';
import { AuthRequest } from '../types/express';
import { imageUpload, queryFilters } from '../utils/global';
import { sendNotification } from '../utils/pushToken';

// ─── File Upload Helper ───────────────────────────────────────────────────────

const uploadAnyFile = async (
  file: any,
): Promise<{ url: string; id?: string; name: string }> => {
  const mimeType: string = file.mimetype || '';
  const isMedia =
    mimeType.startsWith('image/') ||
    mimeType.startsWith('video/') ||
    mimeType.startsWith('audio/') ||
    [
      'audio/x-m4a',
      'audio/mp4',
      'audio/mpeg',
      'audio/ogg',
      'audio/wav',
    ].includes(mimeType);

  if (isMedia) {
    const result = await imageUpload(file);
    return { ...result, name: file.originalname };
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'raw', folder: 'chat_files' },
      (error, result) => {
        if (error || !result)
          return reject(error ?? new Error('Cloudinary upload failed'));
        resolve({
          url: result.secure_url,
          id: result.public_id,
          name: file.originalname,
        });
      },
    );
    stream.end(file.buffer);
  });
};

// ─── MIME classifier ──────────────────────────────────────────────────────────

const classifyMime = (
  mimeType: string,
): 'audio' | 'video' | 'photo' | 'file' => {
  if (
    mimeType.startsWith('audio/') ||
    [
      'audio/x-m4a',
      'audio/mp4',
      'audio/mpeg',
      'audio/ogg',
      'audio/wav',
    ].includes(mimeType)
  )
    return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('image/')) return 'photo';
  return 'file';
};

// ─── Shared participant guard ─────────────────────────────────────────────────
// Throws UnauthorizedError when the calling user is not in the room.

const assertParticipant = async (roomId: string, userEmail: string) => {
  const room = await Room.findOne({
    _id: roomId,
    participantsArray: { $in: [userEmail] },
  });
  if (!room) throw new UnauthorizedError('Not a room participant');
  return room;
};

// ─── sendMsg ──────────────────────────────────────────────────────────────────

export const sendMsg = async (req: AuthRequest, res: Response) => {
  // FIX #2 — verify sender belongs to the room before anything else
  await assertParticipant(req.body.roomId, req.user?.email as string);

  const rawFiles: any = req.files || {};
  const allFiles: any[] = [
    ...(Array.isArray(rawFiles) ? rawFiles : []),
    ...(rawFiles['media'] || []),
    ...(rawFiles['files'] || []),
  ];

  // FIX #6 — run all uploads in parallel
  const uploaded = await Promise.all(allFiles.map(uploadAnyFile));

  const fileTypes: Record<'audio' | 'video' | 'photo' | 'file', any[]> = {
    audio: [],
    video: [],
    photo: [],
    file: [],
  };

  uploaded.forEach((item, i) => {
    fileTypes[classifyMime(allFiles[i].mimetype || '')].push(item);
  });

  const newMsg = await Message.create({
    ...req.body,
    user: req.user?.userId,
    photo: fileTypes.photo,
    audio: fileTypes.audio,
    video: fileTypes.video,
    file: fileTypes.file,
    sent: true,
  });

  // Update lastMessage as an ObjectId ref (matches updated roomModel)
  await Room.findOneAndUpdate(
    { _id: req.body.roomId },
    { $set: { lastMessage: newMsg._id } },
    { new: true },
  );

  // FIX #9 — fire-and-forget: slow Expo API must not block the response
  sendNotification(req, newMsg).catch(console.error);

  res.status(StatusCodes.CREATED).json({ newMsg });
};

// ─── retrieveMsg ─────────────────────────────────────────────────────────────

export const retrieveMsg = async (req: AuthRequest, res: Response) => {
  await assertParticipant(
    req.params.roomId as string,
    req.user?.email as string,
  );

  const { page, skip, limit } = queryFilters(req);

  const messages = await Message.find({ roomId: req.params.roomId })
    .sort('-createdAt')
    .limit(limit)
    .skip(skip)
    .populate({
      path: 'user',
      select: 'username avatar expoToken email status _id',
    });

  res.status(StatusCodes.OK).json({ messages, page });
};

// ─── updateMsg ───────────────────────────────────────────────────────────────

export const updateMsg = async (req: AuthRequest, res: Response) => {
  // FIX #1a — removed stale JWT status guard entirely
  // FIX #1b — "user" is a plain ObjectId ref, not a nested object;
  //            "user._id" never matched anything
  const message = await Message.updateMany(
    {
      roomId: req.params.roomId,
      user: { $ne: req.user?.userId },
    },
    { $set: { isRead: true, received: true } },
  );

  if (!message)
    throw new NotFoundError(`No messages in room: ${req.params.roomId}`);

  res.status(StatusCodes.OK).json({ message, msg: 'Messages marked as read.' });
};

// ─── deleteMsg ───────────────────────────────────────────────────────────────

export const deleteMsg = async (req: AuthRequest, res: Response) => {
  // FIX #3 — only the message author may delete it
  const message = await Message.findOneAndDelete({
    _id: req.params.id,
    user: req.user?.userId,
  });

  if (!message)
    throw new UnauthorizedError(
      'Message not found or you are not allowed to delete it',
    );

  res.status(StatusCodes.OK).json({ msg: 'Message deleted.' });
};
