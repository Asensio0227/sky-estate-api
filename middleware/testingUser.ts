import { NextFunction, Request, Response } from 'express';
import { AuthRequest } from '../types/express';
import { BadRequestError } from '../errors/custom';

export const testingUser = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.guestUser) {
    throw new BadRequestError('Guest User. Read Only!');
  }
  next();
};
