import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { BadRequestError, NotFoundError } from '../errors/custom';
import Room, { RoomType } from '../models/roomModel';
import User, { UserDocument } from '../models/userModel';
import { queryFilters } from '../utils/global';

interface CreateRoomResponse {
  existingRoom?: RoomType;
  newRoom?: RoomType;
}

export const createRoom = async (
  req: Request,
  res: Response
): Promise<CreateRoomResponse | any> => {
  const { participants, participantsArray } = req.body;

  if (!participants || !participantsArray) {
    throw new BadRequestError('Please provide all values');
  }

  const existingRoom = await Room.findOne({
    participantsArray: { $all: participantsArray },
  });

  if (existingRoom) {
    return res.status(StatusCodes.CREATED).json({ existingRoom });
  }

  const newRoom = new Room({
    userId: req.user?.userId,
    participants,
    participantsArray,
    lastMessage: {},
  });

  await newRoom.save(); // Ensure to save the new room before responding
  return res.status(StatusCodes.CREATED).json({ newRoom }); // Explicitly returning response
};

export const retrieveUserRooms = async (req: Request, res: Response) => {
  const { page, skip, limit } = queryFilters(req);
  const rooms = await Room.find({
    participantsArray: { $in: [req.user?.email] },
  })
    .sort({ 'lastMessage.createdAt': -1 })
    .skip(skip)
    .limit(limit)
    .populate({
      path: 'userId',
      select: 'username avatar expoToken email status',
    });

  res.status(StatusCodes.CREATED).json({ page, rooms });
};

export const retrieveRoom = async (req: Request, res: Response) => {
  const room = await Room.findOne({ _id: req.params.id }).populate({
    path: 'userId',
    select: 'username avatar expoToken email status',
  });

  if (!room) {
    throw new NotFoundError(`No room found with ${req.params.id}`);
  }
  res.status(StatusCodes.OK).json({ room });
};

export const updateRoom = async (req: Request, res: Response) => {
  const { id } = req.params;
  const rooms = await Room.findOne({ _id: id });

  if (!rooms) throw new NotFoundError(`No room with id : ${id}`);

  let participants = [];

  for (const room of rooms?.participantsArray) {
    const user: UserDocument | any = await User.findOne({ email: room });
    const { status, email, avatar, expoToken, username, _id, lastSeen } = user;
    const part = { status, email, avatar, expoToken, username, _id, lastSeen };
    participants.push(part);
  }

  rooms.participants = participants;
  rooms.lastMessage = req.body.lastMessage;
  await rooms.save();

  res.status(StatusCodes.OK).json({ rooms });
};

export const removeRoom = async (req: Request, res: Response) => {
  const room = await Room.findOne({ _id: req.params.id });

  if (!room)
    throw new NotFoundError(`No room found with id : ${req.params.id}`);
  await room.deleteOne();
  res.status(StatusCodes.OK).json({ msg: 'Success! conversations deleted. ' });
};
