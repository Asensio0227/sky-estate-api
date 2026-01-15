import crypto from 'crypto';
import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthenticatedError } from '../errors/custom';
import { UserDocument } from '../models/userModel';

const createJwt = ({ payload }: { payload: any }) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be defined');
  }
  const lifetime: any = process.env.JWT_LIFETIME;

  if (!lifetime) {
    throw new Error('JWR_LIFETIME must be defined');
  }
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: lifetime,
  });
  return token;
};

const createRefreshToken = ({ payload }: { payload: any }) => {
  if (!process.env.JWT_SECRET_REFRESH) {
    throw new Error('JWT_SECRET_REFRESH must be defined');
  }

  const lifetime: any = process.env.JWT_LIFETIME;

  if (!lifetime) {
    throw new Error('JWR_LIFETIME must be defined');
  }

  const token = jwt.sign(payload, process.env.JWT_SECRET_REFRESH, {
    expiresIn: lifetime,
  });
  return token;
};

export const attachCookiesToResponse = ({
  res,
  user,
  refreshToken,
}: {
  res: Response;
  user: unknown | UserDocument;
  refreshToken: string;
}) => {
  const accessTokenJWT = createJwt({ payload: { user, refreshToken } });
  const refreshTokenJWT = createRefreshToken({
    payload: { user, refreshToken },
  });
  const oneDay = 1000 * 60 * 60 * 24;
  const longerExp = 1000 * 60 * 60 * 24 * 7;

  res.cookie('access_token', accessTokenJWT, {
    httpOnly: true,
    expires: new Date(Date.now() + oneDay),
    secure: process.env.NODE_ENV === 'production',
    signed: true,
  });

  res.cookie('refresh_token', refreshTokenJWT, {
    httpOnly: true,
    expires: new Date(Date.now() + longerExp),
    secure: process.env.NODE_ENV === 'production',
    signed: true,
  });
};

export const createTokenUser = (user: UserDocument) => {
  const GUEST_USER_ID = process.env.GUEST_USER_ID || '67b487476845366caa92ab43';
  const guestUserFlag = user._id.toString() === GUEST_USER_ID;

  return {
    fName: `${user.first_name} ${user.last_name}`,
    userId: user._id,
    role: user.role,
    avatar: user.avatar,
    email: user.email,
    username: user.username,
    expoToken: user.expoToken,
    status: user.status,
    lastSeen: user.lastSeen,
    guestUser: guestUserFlag,
  };
};

export const hashString = (hash: string): string =>
  crypto.createHash('md5').update(hash).digest('hex');

export const isTokenValid = (token: string, value: string) => {
  if (!token && !value) {
    throw new UnauthenticatedError('Invalid token');
  }

  return jwt.verify(token, value);
};
