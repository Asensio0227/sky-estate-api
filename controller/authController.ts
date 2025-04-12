import crypto from 'crypto';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import {
  BadRequestError,
  UnauthenticatedError,
  UnauthorizedError,
} from '../errors/custom';
import Token from '../models/tokenModel';
import User, { UserDocument } from '../models/userModel';
import { sendResetPasswordEmail, sendVerificationEmail } from '../utils/email';
import { imageUpload } from '../utils/global';
import { attachCookiesToResponse, createTokenUser } from '../utils/jwt';

export const register = async (req: Request, res: Response) => {
  const emailAlreadyExists = await User.findOne({ email: req.body.email });

  if (emailAlreadyExists) {
    throw new BadRequestError('Email already exists');
  }

  if (req.file) {
    try {
      const file = req.file;
      const { url } = await imageUpload(file);
      req.body.avatar = url;
    } catch (error: any) {
      throw new BadRequestError(`Cloudinary upload error, ${error.message}`);
    }
  }

  const isFirstAccount = (await User.countDocuments({})) === 0;
  const role = isFirstAccount ? 'admin' : 'user';
  const min = parseFloat(process.env.CRYPTO_MIN as any);
  const max = parseFloat(process.env.CRYPTO_MAX as any);
  const verificationToken = crypto.randomInt(min, max + 1);
  const parsedLocation = JSON.parse(req.body.userAds_address);
  req.body.userAds_address = parsedLocation;
  const user: UserDocument = await User.create({
    ...req.body,
    role,
    verificationToken,
  });
  const fName = `${user.first_name} ${user.last_name}`;
  const Email = user.email;
  await sendVerificationEmail({
    name: fName,
    email: Email,
    verificationToken: user.verificationToken,
  });

  res
    .status(StatusCodes.CREATED)
    .json({ msg: 'Success! Please check your email to verify account' });
};

export const resendCode = async (req: Request, res: Response) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    throw new BadRequestError('User not found');
  }

  if (user.isVerified) {
    throw new BadRequestError('User is verified');
  }

  const fName = `${user.first_name} ${user.last_name}`;
  await sendVerificationEmail({
    name: fName,
    email: user.email,
    verificationToken: user.verificationToken,
  });

  res.status(StatusCodes.OK).json({ msg: 'code sent' });
};

export const verifyEmail = async (req: Request, res: Response) => {
  const { verificationToken, email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    throw new UnauthenticatedError('Verification Failed!');
  }

  if (user.verificationToken !== verificationToken) {
    throw new UnauthenticatedError('Verification token Failed!');
  }

  user.isVerified = true;
  user.verified = Date.now();
  user.verificationToken = '';
  await user.save();

  res.status(StatusCodes.OK).json({ msg: 'Email verified!' });
};

export const login = async (req: Request, res: Response) => {
  const { username, password, expoToken, userAds_address } = req.body;

  if (!username || !password) {
    throw new BadRequestError('Please provide username and password!');
  }

  const user = await User.findOneAndUpdate(
    { username },
    { status: 'online', expoToken, userAds_address, lastSeen: new Date() },
    { new: true, runValidator: true }
  );

  if (!user) {
    throw new UnauthenticatedError('Invalid credentials!');
  }

  const isPasswordCorrect = await user.ComparePassword(password);

  if (!isPasswordCorrect) {
    throw new UnauthenticatedError('Invalid Credentials');
  }

  if (!user.isVerified) {
    throw new UnauthenticatedError('Please verify your account');
  }

  if (user.banned) {
    throw new UnauthorizedError('Account is banned');
  }

  const tokenUser = createTokenUser(user);
  let refreshToken = '';
  const existingToken = await Token.findOne({ user: user._id });

  if (existingToken) {
    const { isValid } = existingToken;
    if (!isValid) {
      throw new UnauthenticatedError('Invalid credentials');
    }
    refreshToken = existingToken.refreshToken;
    attachCookiesToResponse({ res, user: tokenUser, refreshToken });
    res.status(StatusCodes.OK).json({ user: tokenUser });
    return;
  }

  refreshToken = crypto.randomBytes(40).toString('hex');
  const userAgent = req.headers['user-agent'];
  const ip = req.ip;
  const userToken = { refreshToken, ip, userAgent, user: user._id };
  await Token.create(userToken);
  attachCookiesToResponse({ res, user: tokenUser, refreshToken });
  res.status(StatusCodes.OK).json({ user });
};

export const logout = async (req: Request, res: Response) => {
  const id = req.user?.userId;
  await User.findByIdAndUpdate(
    id,
    { status: 'offline' },
    { new: true, runValidators: true }
  );
  await Token.findOneAndDelete({ user: id });
  res.cookie('access_token', 'logout', {
    expires: new Date(Date.now() - 1000),
    httpOnly: true,
  });
  res.cookie('refresh_token', 'logout', {
    expires: new Date(Date.now() - 1000),
    httpOnly: true,
  });
  res.status(StatusCodes.OK).json({ msg: 'logging out....' });
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    throw new BadRequestError('Please provide email');
  }

  const user = await User.findOne({ email });

  if (user) {
    const min = parseFloat(process.env.CRYPTO_MIN!);
    const max = parseFloat(process.env.CRYPTO_MAX!);
    const passwordToken = crypto.randomInt(min, max + 1);
    const fName = `${user.first_name} ${user.last_name}`;
    await sendResetPasswordEmail({
      name: fName,
      email: user.email,
      token: passwordToken,
    });

    const tenMinutes = 1000 * 60 * 2;
    const passwordTokenExpirationDate = new Date(Date.now() + tenMinutes);
    user.passwordToken = passwordToken;
    user.passwordTokenExpirationDate = passwordTokenExpirationDate;
    await user.save();
  }
  res
    .status(StatusCodes.OK)
    .json({ msg: 'Please check your email for reset password code.' });
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token, email, password } = req.body;

  if (!token || !email || !password) {
    throw new BadRequestError('Please provide all values');
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new BadRequestError('Invalid credentials!');
  }

  if (user.passwordToken !== token) {
    throw new UnauthenticatedError('Password token Failed!');
  }

  const currentDate = new Date();
  if (
    user.passwordToken === token &&
    user.passwordTokenExpirationDate! > currentDate
  ) {
    user.password = password;
    user.passwordToken = null;
    user.passwordTokenExpirationDate = null;
    await user.save();
  }

  res.status(StatusCodes.OK).json({ msg: 'Success! Reset password.' });
};
