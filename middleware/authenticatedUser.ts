import { NextFunction, Request, Response } from 'express';
import { AuthRequest } from '../types/express';
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
  guestUser?: boolean;
}

export interface payloadUser {
  user: authUser;
  refresh_token?: string;
  access_token?: string;
}

export const authenticatedUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const { refresh_token: cookieRefreshToken, access_token: cookieAccessToken } = req.signedCookies;

  // Authorization header (MOBILE / EXPO)
  let headerToken: string | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    headerToken = authHeader.split(' ')[1];
  }

  // x-refresh-token header (Expo SecureStore — cookies unavailable in native)
  const headerRefreshToken = req.headers['x-refresh-token'] as string | undefined;

  const GUEST_USER_ID = process.env.GUEST_USER_ID || '67b487476845366caa92ab43';

  // 1️⃣ Try access token (header first, then cookie)
  const accessToken = headerToken || cookieAccessToken;
  if (accessToken) {
    try {
      const payload: any = isTokenValid(accessToken, process.env.JWT_SECRET!);
      req.user = { ...payload.user, guestUser: payload.user.userId === GUEST_USER_ID };
      return next();
    } catch {
      // Access token invalid/expired — fall through to refresh token
    }
  }

  // 2️⃣ Try refresh token (header for Expo, cookie for web)
  const refreshToken = headerRefreshToken || cookieRefreshToken;
  if (refreshToken) {
    try {
      const payload: any = isTokenValid(refreshToken, process.env.JWT_SECRET_REFRESH!);

      const existingToken = await Token.findOne({
        user: payload.user.userId,
        refreshToken: payload.refreshToken,
      });

      if (!existingToken || !existingToken.isValid) {
        throw new UnauthenticatedError('Authentication Invalid');
      }

      // Issue new access + refresh tokens (rotation)
      attachCookiesToResponse({
        res,
        user: payload.user,
        refreshToken: existingToken.refreshToken,
      });

      req.user = { ...payload.user, guestUser: payload.user.userId === GUEST_USER_ID };
      return next();
    } catch {
      throw new UnauthenticatedError('Authentication Invalid');
    }
  }

  throw new UnauthenticatedError('Authentication Invalid');
};

export const authorizedPermissions = (...role: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role || 'user';
    if (!role.includes(userRole)) {
      throw new UnauthorizedError('Unauthorized to access this route');
    }
    next();
  };
};

// Special middleware for estate creation:
// - super-admin and admin: always allowed
// - member: always allowed
// - realtor: ONLY if realtorStatus === 'approved'
// - user / assistant / anything else: blocked
import User from '../models/userModel';

export const authorizedToCreateAd = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const role: string = req.user?.role || 'user';
  const userId = req.user?.userId;

  // Super-admin, admin and member always pass through — no verification required
  if (role === 'super-admin' || role === 'admin' || role === 'member') {
    return next();
  }

  // Approved realtors pass through — createAd will stamp verificationType = 'realtor'
  if (role === 'realtor') {
    const user = await User.findById(userId).select('realtorStatus');
    if (!user) throw new UnauthorizedError('User not found');
    if (user.realtorStatus !== 'approved') {
      throw new UnauthorizedError(
        'Your realtor application is not yet approved. You cannot create listings.',
      );
    }
    return next();
  }

  // Regular users (role === 'user' | 'assistant') may post IF they have
  // an approved ID verification — createAd will stamp verificationType = 'id'
  if (role === 'user' || role === 'assistant') {
    const user = await User.findById(userId).select('idVerification');
    if (!user) throw new UnauthorizedError('User not found');
    if (user.idVerification?.status === 'approved') {
      return next();
    }
    throw new UnauthorizedError(
      'ID verification required to post listings. ' +
      'Please submit your ID via POST /api/v1/verify/id and wait for approval.',
    );
  }

  // Any other role is blocked
  throw new UnauthorizedError(
    'You do not have permission to create estate listings.',
  );
};
