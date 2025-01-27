declare module 'express-xss-sanitizer' {
  import { RequestHandler } from 'express';
  const xssSanitizer: RequestHandler;
  export default xssSanitizer;
}
