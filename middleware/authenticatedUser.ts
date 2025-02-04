import { NextFunction, Request, Response } from 'express';
import { UnauthenticatedError } from '../errors/custom';
import Token from '../models/tokenModal';
import { attachCookiesToResponse, isTokenValid } from '../utils/jwt';

export interface authUser {
  role: string;
  fName: string;
  userId: string;
  avatar?: string;
  email: string;
  username: string;
  expoToken?: string;
  status: string;
}

export interface payloadUser {
  user: authUser;
  refresh_token?: string;
  access_token?: string;
}

export const authenticatedUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { refresh_token, access_token } = req.signedCookies;
  try {
    if (access_token) {
      const payload: any | payloadUser = isTokenValid(
        access_token,
        process.env.JWT_SECRET!
      );
      const testUser = payload.user?.userId === '';
      req.user = payload.user;
      return next();
    }

    const payload: any | payloadUser = isTokenValid(
      refresh_token,
      process.env.JWT_SECRET_REFRESH!
    );
    const existingToken = await Token.findOne({
      user: payload.user.userId,
      refreshToken: payload.refresh_token,
    });

    if (!existingToken || !existingToken?.isValid) {
      throw new UnauthenticatedError('Authentication Invalid!');
    }

    attachCookiesToResponse({
      res,
      user: payload.user,
      refreshToken: existingToken.refreshToken,
    });

    const testUser = payload.user?.userId === '';
    req.user = payload.user;
    next();
  } catch (error: any) {
    console.log(error);
  }
};
