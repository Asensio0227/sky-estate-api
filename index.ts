import dotenv from 'dotenv';
import 'express-async-errors';
dotenv.config();

import express, { RequestHandler } from 'express';
const app = express();

import asyncHandler from 'express-async-handler';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import path from 'path';

import cookieParser from 'cookie-parser';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import helmet from 'helmet';

// routes
import errorHandleMiddleware from './middleware/error-handle';
import { NotFoundMiddleware } from './middleware/not-found';
import authRoute from './routes/authRoute';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.set('trust-proxy', 1);
app.use(limiter);

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}
app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.use(cookieParser(process.env.JWT_SECRET));
app.use(helmet());
app.use(cors());
// app.use(xss());
app.use(mongoSanitize());

app.get('/', function (req, res) {
  res.send('SkyEstate Housing App');
});

app.get('/api/v1', (req, res) => {
  res.send('SkyEstate Housing App Api');
});

app.use('/api/v1/auth', asyncHandler(authRoute));

// errors handler middleware
app.use(errorHandleMiddleware as unknown as RequestHandler);
app.use(NotFoundMiddleware as unknown as RequestHandler);

const port = process.env.port || 5000;

async function start(): Promise<void> {
  try {
    await app.listen(port, () => console.log(`Server running on port ${port}`));
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

start();
start();
