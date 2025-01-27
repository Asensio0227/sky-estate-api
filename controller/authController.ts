import crypto from 'crypto';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { BadRequestError } from '../errors/custom';

import User from '../models/userModel';

export const register = async (req: Request, res: Response) => {
  const userData = req.body;
  const emailAlreadyExists = await User.findOne({ email: userData.email });

  if (!emailAlreadyExists) {
    throw new BadRequestError('Email already exists');
  }

  const isFirstAccount = (await User.countDocuments({})) === 0;
  const role = isFirstAccount ? 'admin' : 'user';
  const min = parseFloat(process.env.CRYPTO_MIN as any);
  const max = parseFloat(process.env.CRYPTO_MAx as any);
  const verificationToken = crypto.randomInt(min, max + 1);
  const user = await User.create({ ...userData, role, verificationToken });
  const fName = `${user.first_name} ${user.last_name}`;
  // await send

  res
    .status(StatusCodes.CREATED)
    .json({ msg: 'Success! Please check your email to verify account' });
};

export const verifyEmail = async (req: Request, res: Response) => {
  res.status(StatusCodes.OK).json({ msg: 'verify email ' });
};

export const login = async (req: Request, res: Response) => {
  res.status(StatusCodes.OK).json({ msg: 'login user' });
};

export const logout = async (req: Request, res: Response) => {
  res.status(StatusCodes.OK).json({ msg: 'register user' });
};

export const resetPassword = async (req: Request, res: Response) => {
  res.status(StatusCodes.OK).json({ msg: 'reset password  ' });
};

export const forgotPassword = async (req: Request, res: Response) => {
  res.status(StatusCodes.OK).json({ msg: 'forgot password ' });
};
