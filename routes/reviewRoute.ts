import express from 'express';
import {
  createReview,
  removeReview,
  retrieveAllReview,
  retrieveReview,
  updateReview,
} from '../controller/reviewController';
import { testingUser } from '../middleware/testingUser';

const router = express.Router();

router.get('/', retrieveAllReview);
router.get('/:id', retrieveReview);
router.post('/', testingUser, createReview);
router.put('/:id', testingUser, updateReview);
router.delete('/:id', testingUser, removeReview);

export default router;
