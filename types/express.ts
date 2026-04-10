import { Request } from 'express';

export interface AuthUser {
  role: string;
  userId: string;
  fName: string;
  avatar?: string;
  email: string;
  username: string;
  expoToken?: string;
  status?: string;
  guestUser?: boolean;
}

// Use this type for any route handler that needs req.user
export interface AuthRequest extends Request {
  user?: AuthUser;
}
