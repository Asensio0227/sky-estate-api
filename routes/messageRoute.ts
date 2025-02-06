import express from 'express';
import {
  deleteMsg,
  retrieveMsg,
  sendMsg,
  updateMsg,
} from '../controller/messageController';
import { upload } from '../middleware/multerMiddleware';
const router = express.Router();

router.route('/').post(upload.array('media', 12), sendMsg);
router
  .route('/:roomId')
  .get(retrieveMsg)
  .put(upload.array('media', 12), updateMsg);
router.route('/:id').delete(deleteMsg);

export default router;
