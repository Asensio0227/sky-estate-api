import { Response } from 'express';
import { AuthRequest } from '../types/express';
import { StatusCodes } from 'http-status-codes';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../errors/custom';
import Room, { RoomType } from '../models/roomModel';
import User from '../models/userModel';
import { queryFilters } from '../utils/global';

interface CreateRoomResponse {
  existingRoom?: RoomType;
  newRoom?: RoomType;
}

export const createRoom = async (
  req: AuthRequest,
  res: Response,
): Promise<CreateRoomResponse | any> => {
  const { participantsArray } = req.body;

  if (!participantsArray || !Array.isArray(participantsArray) || participantsArray.length < 2) {
    throw new BadRequestError('participantsArray must be an array of at least 2 email addresses');
  }

  // FIX #5 — validate that all participant emails actually exist
  const users = await User.find(
    { email: { $in: participantsArray } },
    { _id: 1, email: 1, username: 1, avatar: 1, status: 1, expoToken: 1, lastSeen: 1 },
  );

  if (users.length !== participantsArray.length) {
    throw new BadRequestError('One or more participants do not exist');
  }

  // Check for existing room with exactly these participants
  const existingRoom = await Room.findOne({
    participantsArray: { $all: participantsArray, $size: participantsArray.length },
  }).populate({
    path: 'lastMessage',
    select: 'text photo audio video file createdAt user sent received isRead',
  });

  if (existingRoom) {
    return res.status(StatusCodes.OK).json({ existingRoom });
  }

  // FIX #12 — participants stored as ObjectId refs (not raw objects)
  const participantIds = users.map((u) => u._id);

  const newRoom = new Room({
    userId: req.user?.userId,
    participants: participantIds,
    participantsArray,               // keep emails for fast $in queries
    lastMessage: null,
  });

  await newRoom.save();
  return res.status(StatusCodes.CREATED).json({ newRoom });
};

// ─── retrieveUserRooms ────────────────────────────────────────────────────────

export const retrieveUserRooms = async (req: AuthRequest, res: Response) => {
  const { page, skip, limit } = queryFilters(req);

  // FIX #5 — participantsArray is consistently email-based
  const rooms = await Room.find({
    participantsArray: { $in: [req.user?.email] },
  })
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate({
      path: 'participants',
      select: 'username avatar expoToken email status lastSeen',
    })
    .populate({
      path: 'lastMessage',
      select: 'text photo audio video file createdAt user sent received isRead',
    });

  res.status(StatusCodes.OK).json({ page, rooms });
};

// ─── retrieveRoom ─────────────────────────────────────────────────────────────

export const retrieveRoom = async (req: AuthRequest, res: Response) => {
  const room = await Room.findOne({ _id: req.params.id })
    .populate({
      path: 'participants',
      select: 'username avatar expoToken email status lastSeen',
    })
    .populate({
      path: 'lastMessage',
      select: 'text photo audio video file createdAt user sent received isRead',
    });

  if (!room) throw new NotFoundError(`No room found with id: ${req.params.id}`);

  // Ensure caller is a participant
  if (!room.participantsArray.includes(req.user?.email as string)) {
    throw new UnauthorizedError('Not a room participant');
  }

  res.status(StatusCodes.OK).json({ room });
};

// ─── updateRoom ───────────────────────────────────────────────────────────────

export const updateRoom = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const room = await Room.findOne({ _id: id });

  if (!room) throw new NotFoundError(`No room with id: ${id}`);

  if (!room.participantsArray.includes(req.user?.email as string)) {
    throw new UnauthorizedError('Not a room participant');
  }

  // FIX #7 — single query replaces N serial User.findOne calls
  const users = await User.find(
    { email: { $in: room.participantsArray } },
    { _id: 1, email: 1, username: 1, avatar: 1, status: 1, expoToken: 1, lastSeen: 1 },
  );

  // FIX #4 — lastMessage is NEVER written from the client; removed entirely
  await Room.findOneAndUpdate(
    { _id: id },
    { $set: { participants: users.map((u) => u._id) } },
    { new: true, runValidators: true },
  );

  res.status(StatusCodes.OK).json({ msg: 'Room updated.', participants: users });
};

// ─── removeRoom ───────────────────────────────────────────────────────────────

export const removeRoom = async (req: AuthRequest, res: Response) => {
  const room = await Room.findOne({ _id: req.params.id });

  if (!room) throw new NotFoundError(`No room found with id: ${req.params.id}`);

  if (!room.participantsArray.includes(req.user?.email as string)) {
    throw new UnauthorizedError('Not a room participant');
  }

  await room.deleteOne();
  res.status(StatusCodes.OK).json({ msg: 'Conversation deleted.' });
};
