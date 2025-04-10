import express from 'express';
import {
  createReview,
  removeReview,
  retrieveAllReview,
  retrieveReview,
  updateReview,
} from '../controller/reviewController';

const router = express.Router();

router.route('/').post(createReview).get(retrieveAllReview);

router
  .route('/:id')
  .get(retrieveReview)
  .patch(updateReview)
  .delete(removeReview);

export default router;
