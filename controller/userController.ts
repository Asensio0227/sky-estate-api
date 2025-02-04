import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { BadRequestError, NotFoundError } from '../errors/custom';
import User from '../models/userModal';

interface QueryObject {
  isVerified: boolean;
  role?: string;
  banned?: any | boolean;
  [key: string]: any; // This allows for additional properties
}

export const getAllUsers = async (req: Request, res: Response) => {
  let { search, sort, role, banned } = req.query;
  let queryObj: QueryObject = { isVerified: true };

  if (typeof role === 'string' && role.trim() !== 'all') {
    queryObj.role = role;
  }

  if (banned) {
    queryObj.banned = banned;
  }

  if (search) {
    queryObj['$or'] = [
      { first_name: { $regex: search, $options: 'i' } },
      { last_name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { username: { $regex: search, $options: 'i' } },
    ];
  }
  let sortOptions: any = {
    newest: '-createdAt',
    oldest: 'createdAt',
    'a-z': 'username',
    'z-a': '-username',
  };

  const sortKey = sortOptions.newest || sortOptions;
  console.log(sortKey);
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const users = await User.find(queryObj)
    .select('-password')
    .sort(sortKey)
    .skip(skip)
    .limit(limit);
  const totalUsers = await User.countDocuments(queryObj);
  const numOfPages = Math.ceil(totalUsers / limit);
  res.status(StatusCodes.OK).json({ users, totalUsers, numOfPages });
};

export const showMeUser = async (req: Request, res: Response) => {
  const user = await User.findById(req.user?.userId).select('-password');
  res.status(StatusCodes.OK).json({ user });
};

export const getSingleUser = async (req: Request, res: Response) => {
  const { id }: { id?: string } = req.params;

  if (!id) {
    throw new BadRequestError('Invalid credentials!');
  }

  const user = await User.findById(id).select('-password');

  if (!user) {
    throw new NotFoundError('No user found!');
  }

  res.status(StatusCodes.OK).json({ user });
};

export const updateUser = async (req: Request, res: Response) => {
  res.status(StatusCodes.OK).json({ msg: ' update user' });
};

export const actionUser = async (req: Request, res: Response) => {
  res.status(StatusCodes.OK).json({ msg: 'action user' });
};
