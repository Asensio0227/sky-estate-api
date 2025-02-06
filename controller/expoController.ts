import Expo from 'expo-server-sdk';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { UnauthorizedError } from '../errors/custom';
import User, { UserDocument } from '../models/userModel';

export const createPushToken = async (req: Request, res: Response) => {
  const user: UserDocument | any = await User.findById(req.user?.userId);

  if (!user) throw new UnauthorizedError('YInvalid user.');

  if (!Expo.isExpoPushToken(req.body.expoToken))
    throw new UnauthorizedError('YInvalid token.');

  user.expoToken = req.user?.expoToken;
  await user.save();
  res
    .status(StatusCodes.CREATED)
    .json({ msg: 'Success! Expo token created. ' });
};
