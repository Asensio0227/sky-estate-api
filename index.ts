import dotenv from 'dotenv';
import 'express-async-errors';
dotenv.config();

import express, { RequestHandler } from 'express';
const app = express();

import cloudinary from 'cloudinary';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import path from 'path';

import cookieParser from 'cookie-parser';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import helmet from 'helmet';
import hpp from 'hpp';

// routes
import authRoute from './routes/authRoute';
import estateRoute from './routes/estateRoute';
import guestRoute from './routes/guestRoute';
import messageRoute from './routes/messageRoute';
import notificationsRoute from './routes/notificationsRoute';
import realtorRoute from './routes/realtorRoute';
import reviewRoute from './routes/reviewRoute';
import roomRoute from './routes/roomRoute';
import userRoute from './routes/userRoute';
import verificationRoute from './routes/verificationRoute';

import connectDB from './db/connect';
import { authenticatedUser } from './middleware/authenticatedUser';
import errorHandleMiddleware from './middleware/error-handle';
import { NotFoundMiddleware } from './middleware/not-found';

cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
  secure: true,
});

const geoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many geo-search requests, please try again later.',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many requests from this IP, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/v1/estate/rent', geoLimiter);
app.use('/api/v1/estate/nearby', geoLimiter);
app.use('/api/v1/estate/search', geoLimiter);

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}
const options = {
  allowProtocolRelativeUrls: false,
  stripIgnoreTag: true,
  stripIgnoreTagBody: true,
};
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));
app.use(cookieParser(process.env.JWT_SECRET));
// app.use(bodyParser.json({ type: 'application/*+json' }));
app.use(helmet());
app.use(
  cors({
    // Expo native clients send no browser origin — CORS origin restriction
    // is not effective for mobile. Auth is enforced via signed Bearer tokens.
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : '*',
    credentials: false, // cookies not used by Expo; tokens sent via Authorization header
  }),
);
app.use(hpp());
// const xssMiddleware = xss({});
// app.use(xssMiddleware);
app.use(mongoSanitize());

app.get('/', function (req, res) {
  res.send('SkyEstate Housing App');
});

app.get('/api/v1', (req, res) => {
  res.send('SkyEstate Housing App Api');
});
app.use('/api/v1/guest/estate', guestRoute);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/auth/forgot-password', authLimiter);
app.use('/api/v1/auth', authRoute);
app.use('/api/v1/user', authenticatedUser, userRoute);
app.use('/api/v1/estate', authenticatedUser, estateRoute);
app.use('/api/v1/realtor', authenticatedUser, realtorRoute);
app.use('/api/v1/verify', authenticatedUser, verificationRoute);
app.use('/api/v1/review', authenticatedUser, reviewRoute);
app.use('/api/v1/room', authenticatedUser, roomRoute);
app.use('/api/v1/message', authenticatedUser, messageRoute);
app.use('/api/v1/notify', authenticatedUser, notificationsRoute);

// errors handler middleware
app.use(NotFoundMiddleware as unknown as RequestHandler);
app.use(errorHandleMiddleware as unknown as RequestHandler);

const port = process.env.port || 5000;
// const port = 3000;

async function start(): Promise<void> {
  try {
    await connectDB(process.env.MONGO_URL as string);
    app.listen(port, () => console.log(`Server running on port ${port}`));
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

start();
