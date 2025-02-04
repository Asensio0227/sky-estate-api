import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        role: string;
        userId: string;
        fName: string;
        avatar?: string;
        email: string;
        username: string;
        expoToken?: string;
        status?: string;
      };
    }
  }
}
