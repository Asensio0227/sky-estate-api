declare module 'express-rate-limiter' {
  import { RequestHandler } from 'express';

  interface RateLimiterOptions {
    windowMs?: number;
    max?: number;
    message?: string | object;
    handler?: (req: any, res: any) => void;
  }

  function rateLimiter(options: RateLimiterOptions): RequestHandler;

  export default rateLimiter;
}
