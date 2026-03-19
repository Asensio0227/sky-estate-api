import { v2 as cloudinary } from 'cloudinary';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { NotFoundError, UnauthorizedError } from '../errors/custom';
import Message from '../models/messageModel';
import Room, { RoomType } from '../models/roomModel';
import { imageUpload, queryFilters } from '../utils/global';

// For images/audio/video — use your existing imageUpload (resource_type:'image'/'video'/'audio')
// For PDFs, DOCs, ZIPs etc — Cloudinary requires resource_type:'raw', imageUpload() will 500
const uploadAnyFile = async (
  file: any,
): Promise<{ url: string; id: string }> => {
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
    return imageUpload(file);
  }

  // Non-media file (PDF, DOC, ZIP etc) — upload as raw
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'raw', folder: 'chat_files' },
      (error, result) => {
        if (error || !result)
          return reject(error ?? new Error('Cloudinary upload failed'));
        resolve({ url: result.secure_url, id: result.public_id });
      },
    );
    stream.end(file.buffer);
  });
};

export const sendMsg = async (req: Request, res: Response) => {
  const fileTypes: any = {
    audio: [],
    video: [],
    photo: [],
    file: [],
  };

  // upload.fields() gives { media: [...], files: [...] }
  // upload.array() gives a flat array — handle both
  const rawFiles: any = req.files || {};
  const files: any[] = [
    ...(Array.isArray(rawFiles) ? rawFiles : []),
    ...(rawFiles.media || []), // images/audio/video from customMsg
    ...(rawFiles.files || []), // documents/PDFs from sendFileMsg
  ];

  for (const file of files) {
    const { url, id } = await uploadAnyFile(file);
    const mimeType: string = file.mimetype || '';
    const mediaItem = { url, id, name: file.originalname };

    if (
      mimeType.startsWith('audio/') ||
      [
        'audio/x-m4a',
        'audio/mp4',
        'audio/mpeg',
        'audio/ogg',
        'audio/wav',
      ].includes(mimeType)
    ) {
      fileTypes.audio.push(mediaItem);
    } else if (mimeType.startsWith('video/')) {
      fileTypes.video.push(mediaItem);
    } else if (mimeType.startsWith('image/')) {
      fileTypes.photo.push(mediaItem);
    } else {
      fileTypes.file.push(mediaItem);
    }
  }

  const newMsg = await Message.create({
    ...req.body,
    user: req.user?.userId,
    photo: fileTypes.photo,
    audio: fileTypes.audio,
    video: fileTypes.video,
    file: fileTypes.file,
    sent: true,
  });

  // ✅ Use findOneAndUpdate instead of room.save() to avoid Mongoose
  // optimistic concurrency version conflicts (VersionError) when multiple
  // requests update the same room document concurrently.
  await Room.findOneAndUpdate(
    { _id: req.body.roomId },
    { $set: { lastMessage: newMsg } },
    { new: true },
  );

  res.status(StatusCodes.CREATED).json({ newMsg });
};

export const retrieveMsg = async (req: Request, res: Response) => {
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

export const updateMsg = async (req: Request, res: Response) => {
  const userStatus = req.user?.status;

  if (!userStatus) {
    throw new UnauthorizedError(
      'User must be online to mark messages as read.',
    );
  }

  const updateFields = {
    isRead: userStatus === 'online' ? true : false,
    received: userStatus === 'online' ? true : false,
  };

  const message = await Message.updateMany(
    {
      roomId: req.params.roomId,
      'user._id': { $ne: req.user?.userId },
    },
    { $set: updateFields },
  );

  if (!message)
    throw new NotFoundError(`No message with id: ${req.params.roomId}`);
  res
    .status(StatusCodes.OK)
    .json({ message, msg: 'Success! Message updated.' });
};

export const deleteMsg = async (req: Request, res: Response) => {
  const message = await Message.findByIdAndDelete(req.params.id);

  if (!message)
    throw new NotFoundError(`No message with id : ${req.params.id}`);

  res.status(StatusCodes.OK).json({ msg: 'Success! Message delete.' });
};
