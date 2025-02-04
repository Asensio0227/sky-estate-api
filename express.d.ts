import { Request } from 'express';

declare module 'express' {
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

// declare global {
//   namespace Express {
//     interface Request {
//       user?: {
//         role: string;
//         userId: string;
//         fName: string;
//         avatar?: string;
//         email: string;
//         username: string;
//         expoToken?: string;
//         status?: string;
//       };
//     }
//   }
// }
