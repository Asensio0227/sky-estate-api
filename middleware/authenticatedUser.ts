import { NextFunction, Request, Response } from 'express';
import { UnauthenticatedError, UnauthorizedError } from '../errors/custom';
import Token from '../models/tokenModel';
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
      req.user = payload.user;
      return next();
    }

    const payload: any | payloadUser = isTokenValid(
      refresh_token,
      process.env.JWT_SECRET_REFRESH!
    );

    console.log(`=====payload====`);
    console.log(payload);
    console.log(`=====payload====`);

    const existingToken = await Token.findOne({
      user: payload.user.userId,
      refreshToken: payload.refreshToken,
    });

    if (!existingToken || !existingToken?.isValid) {
      throw new UnauthenticatedError('Authentication Invalid!');
    }

    attachCookiesToResponse({
      res,
      user: payload.user,
      refreshToken: existingToken.refreshToken,
    });

    req.user = payload.user;
    next();
  } catch (error: any) {
    throw new UnauthenticatedError('Authentication Invalid');
  }
};

export const authorizedPermissions = (...role: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role || 'user';
    if (!role.includes(userRole)) {
      throw new UnauthorizedError('Unauthorized to access this route');
    }
    next();
  };
};
