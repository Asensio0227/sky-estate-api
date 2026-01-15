import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from '../errors/custom';

export const testingUser = (
  req: Request | any,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.guestUser) {
    throw new BadRequestError('Guest User. Read Only!');
  }
  next();
};
