import express from 'express';
import {
  createReview,
  removeReview,
  retrieveAllReview,
  retrieveReview,
  updateReview,
} from '../controller/reviewController';
import { authenticatedUser } from '../middleware/authenticatedUser';

const router = express.Router();

router.route('/').post(authenticatedUser, createReview).get(retrieveAllReview);

router
  .route('/:id')
  .get(retrieveReview)
  .patch(authenticatedUser, updateReview)
  .delete(authenticatedUser, removeReview);

export default router;
