import express from 'express';
const router = express.Router();

import {
  createAd,
  deleteAd,
  markAsTaken,
  retrieveAd,
  retrieveAllAd,
  retrieveAllUserAd,
  updateAd,
} from '../controller/estateController';
import { retrieveEstateReviews } from '../controller/reviewController';
import { upload } from '../middleware/multerMiddleware';

router.post('/', upload.array('media', 6), createAd);
router.get('/', retrieveAllAd);
router.get('/user-ads', retrieveAllUserAd);
router.get('/:id', retrieveAd);
router.patch('/:id', markAsTaken);
router.put('/update-ad/:id', upload.array('media', 6), updateAd);
router.delete('/:id', deleteAd);
router.route('/:id/reviews').get(retrieveEstateReviews);

export default router;
