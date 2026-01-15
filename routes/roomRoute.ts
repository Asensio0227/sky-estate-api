// routes/roomRoute.ts
import express from 'express';
const router = express.Router();

import {
  createRoom,
  removeRoom,
  retrieveRoom,
  retrieveUserRooms,
  updateRoom,
} from '../controller/roomController';
import { testingUser } from '../middleware/testingUser'; // Import

// READ operations
router.get('/', retrieveUserRooms);
router.get('/:id', retrieveRoom);

// WRITE operations - Protected from guest user
router.post('/', testingUser, createRoom);
router.put('/:id', testingUser, updateRoom);
router.delete('/:id', testingUser, removeRoom);

export default router;
