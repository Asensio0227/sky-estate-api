import { JwtPayload } from 'jsonwebtoken';

export interface AuthUser {
  userId: string;
  role: string;
  fName: string;
  email: string;
  username: string;
  avatar?: string;
  expoToken?: string;
  status?: string;
}

export interface AuthJwtPayload extends JwtPayload {
  user: AuthUser;
}
