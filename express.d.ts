import 'express';

declare global {
  namespace Express {
    interface User {
      userId: string;
      role: string;
      fName: string;
      email: string;
      username: string;
      avatar?: string;
      expoToken?: string;
      status?: string;
      guestUser?: boolean; // ✅ ADD HERE
    }

    interface Request {
      user?: User;
    }
  }
}

export {};
