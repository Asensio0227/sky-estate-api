import { StatusCodes } from 'http-status-codes';

class customError extends Error {
  statusCodes: number = StatusCodes.BAD_GATEWAY; // Define statusCodes here
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class BadRequestError extends customError {
  constructor(message: string) {
    super(message);
    this.statusCodes = StatusCodes.BAD_REQUEST;
  }
}

export class NotFoundError extends customError {
  constructor(message: string) {
    super(message);
    this.statusCodes = StatusCodes.NOT_FOUND;
  }
}

export class UnauthorizedError extends customError {
  constructor(message: string) {
    super(message);
    this.statusCodes = StatusCodes.UNAUTHORIZED;
  }
}

export class UnauthenticatedError extends customError {
  constructor(message: string) {
    super(message);
    this.statusCodes = StatusCodes.FORBIDDEN;
  }
}
