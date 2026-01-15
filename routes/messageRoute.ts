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
router.post('/', testingUser, upload.array('media', 6), sendMsg);
router.put('/:roomId', testingUser, updateMsg);
router.delete('/:id', testingUser, deleteMsg);

export default router;
