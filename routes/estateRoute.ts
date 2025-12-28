import express from 'express';
const router = express.Router();

import {
  createAd,
  deleteAd,
  getNearbyEstates,
  getRentals,
  markAsTaken,
  retrieveAd,
  retrieveAllAd,
  retrieveAllUserAd,
  searchEstates,
  updateAd,
} from '../controller/estateController';
import { retrieveEstateReviews } from '../controller/reviewController';
import { upload } from '../middleware/multerMiddleware';

router.post('/', upload.array('media', 6), createAd);
router.get('/', retrieveAllAd);
router.get('/user-ads', retrieveAllUserAd);
router.get('/rent', getRentals);
router.get('/nearby', getNearbyEstates);
router.get('/search', searchEstates);
router.get('/:id', retrieveAd);
router.patch('/:id', markAsTaken);
router.put('/update-ad/:id', upload.array('media', 6), updateAd);
router.delete('/:id', deleteAd);
router.route('/:id/reviews').get(retrieveEstateReviews);

export default router;
