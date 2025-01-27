import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

export const NotFoundMiddleware = async (req: Request, res: Response) =>
  res.status(StatusCodes.NOT_FOUND).json({ msg: 'Route does not exist!' });
