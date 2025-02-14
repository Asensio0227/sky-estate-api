import express from 'express';
const router = express.Router();

import {
  createAd,
  deleteAd,
  retrieveAd,
  retrieveAllAd,
  retrieveAllUserAd,
  updateAd,
} from '../controller/estateController';
import { retrieveEstateReviews } from '../controller/reviewController';
import { authenticatedUser } from '../middleware/authenticatedUser';
import { upload } from '../middleware/multerMiddleware';

router.post('/', authenticatedUser, upload.array('media', 6), createAd);
router.get('/', retrieveAllAd);
router.get('/user-ads', retrieveAllUserAd);
router.get('/:id', authenticatedUser, retrieveAd);
router.put(
  '/update-ad/:id',
  authenticatedUser,
  upload.array('media', 6),
  updateAd
);
router.delete('/:id', authenticatedUser, deleteAd);
router.route('/:id/reviews').get(retrieveEstateReviews);

export default router;
