// routes/messageRoute.ts
import express from 'express';
const router = express.Router();

import {
  deleteMsg,
  retrieveMsg,
  sendMsg,
  updateMsg,
} from '../controller/messageController';
import { upload } from '../middleware/multerMiddleware';
import { testingUser } from '../middleware/testingUser'; // Import

// READ operations
router.get('/:roomId', retrieveMsg);

// WRITE operations - Protected from guest user
router.post(
  '/',
  testingUser,
  upload.fields([
    { name: 'media', maxCount: 6 }, // used by customMsg (images/audio/video)
    { name: 'files', maxCount: 10 }, // used by sendFileMsg (documents/PDFs)
  ]),
  sendMsg,
);
router.put('/:roomId', testingUser, updateMsg);
router.delete('/:id', testingUser, deleteMsg);

export default router;
