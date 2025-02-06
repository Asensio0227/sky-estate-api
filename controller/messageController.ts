import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { NotFoundError, UnauthorizedError } from '../errors/custom';
import Message from '../models/messageModel';
import Room, { RoomType } from '../models/roomModel';
import { imageUpload } from '../utils/global';

export const sendMsg = async (req: Request, res: Response) => {
  const fileTypes: any = {
    audio: [],
    video: [],
    photo: [],
  };
  const files: any = req.files;

  if (files) {
    for (let file of files) {
      const { url } = await imageUpload(file);
      const mimeType = file.mimetype;
      if (mimeType.startsWith('audio/')) {
        fileTypes.audio.push(url);
      } else if (mimeType.startsWith('video/')) {
        fileTypes.video.push(url);
      } else if (mimeType.startsWith('image/')) {
        fileTypes.photo.push(url);
      }
    }
  }

  const newMsg = await Message.create({
    ...req.body,
    user: req.user?.userId,
    photo: fileTypes.photo,
    audio: fileTypes.audio,
    video: fileTypes.video,
    sent: true,
  });
  let lastMessage = newMsg;
  const room: RoomType | any = await Room.findOne({ _id: req.body.roomId });

  room.lastMessage = lastMessage;
  await room.save;
  res.status(StatusCodes.CREATED).json({ newMsg });
};

export const retrieveMsg = async (req: Request, res: Response) => {
  const messages = await Message.find({ roomId: req.params.roomId })
    .sort('-createdAt')
    .populate({
      path: 'user',
      select: 'username avatar expoToken email status _id',
    });

  res.status(StatusCodes.OK).json({ messages });
};

export const updateMsg = async (req: Request, res: Response) => {
  const userStatus = req.user?.status;

  if (!userStatus) {
    throw new UnauthorizedError(
      'User must be online to mark messages as read.'
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
    { $set: updateFields }
  );

  if (!message)
    throw new NotFoundError(`No message with id: ${req.params.roomId}`);
  res.status(StatusCodes.OK).json({ msg: 'Success! Message updated.' });
};

export const deleteMsg = async (req: Request, res: Response) => {
  const message = await Message.findByIdAndDelete(req.params.id);

  if (!message)
    throw new NotFoundError(`No message with id : ${req.params.id}`);

  res.status(StatusCodes.OK).json({ msg: 'Success! Message delete.' });
};
