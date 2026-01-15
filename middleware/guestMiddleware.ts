import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { UnauthenticatedError } from '../errors/custom';
import User, { UserDocument } from '../models/userModel';

export const guestAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const GUEST_USER_ID = process.env.GUEST_USER_ID || '67b487476845366caa92ab43';

  try {
    const guestUser: UserDocument | any = await User.findById(
      GUEST_USER_ID
    ).select(
      '-password -verificationToken -passwordToken -passwordTokenExpirationDate'
    );

    if (!guestUser) {
      throw new UnauthenticatedError('Guest user not found');
    }

    if (guestUser.banned) {
      throw new UnauthenticatedError('Guest account is banned');
    }

    // Attach guest user info to request with guestUser flag
    const userId =
      guestUser._id instanceof mongoose.Types.ObjectId
        ? guestUser._id.toString()
        : String(guestUser._id);

    const guestUserFlag = userId === GUEST_USER_ID;

    req.user = {
      fName: `${guestUser.first_name} ${guestUser.last_name}`,
      userId: guestUser._id.toString(),
      role: guestUser.role,
      avatar: guestUser.avatar,
      email: guestUser.email,
      username: guestUser.username,
      expoToken: guestUser.expoToken,
      status: guestUser.status,
      guestUser: guestUserFlag, // Add flag to identify guest user
    };

    next();
  } catch (error: any) {
    throw new UnauthenticatedError('Guest authentication failed');
  }
};
