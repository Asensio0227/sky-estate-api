import express from 'express';
import {
  createRoom,
  removeRoom,
  retrieveRoom,
  retrieveUserRooms,
  updateRoom,
} from '../controller/roomController';

const router = express.Router();

router.route('/').post(createRoom).get(retrieveUserRooms);
router.route('/:id').delete(removeRoom).get(retrieveRoom).put(updateRoom);

export default router;
