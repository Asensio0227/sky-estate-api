import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

interface ValidationErrorItem {
  message: string;
}

const errorHandleMiddleware = (
  err: Error | any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let customError: { statusCode: number | any; msg: string | any } = {
    statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    msg: err.message || 'Something went wrong try again later!',
  };

  // if (err.name === 'ValidationError') {
  //   const customError = { msg: '', statusCode: 0 };
  //   customError.msg = Object.values(err.errors)
  //     .map((item: ValidationErrorItem) => item.message)
  //     .join(',');
  //   customError.statusCode = 400;
  // }

  if (err.code && err.code === 11000) {
    customError.msg = `Duplicate value enter for ${Object.keys(
      err.keyValue
    )} field, choose another value`;
    customError.statusCode = 400;
  }

  if (err.name === 'CastError') {
    const operation = 'fetching';
    const expectedType = 'ObjectId';
    const timestamp = new Date().toISOString();

    customError.msg = `Error during ${operation}: Invalid ID format '${err.value}' provided at ${timestamp}. Expected type: ${expectedType}.`;
    customError.statusCode = 404;
  }

  return res.status(customError.statusCode).json({ msg: customError.msg });
};

export default errorHandleMiddleware;
