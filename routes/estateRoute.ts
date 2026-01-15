import express from 'express';
const router = express.Router();

import {
  createAd,
  deleteAd,
  getNearbyEstates,
  getRentals,
  incrementAdView,
  markAsTaken,
  retrieveAd,
  retrieveAllAd,
  retrieveAllUserAd,
  searchEstates,
  toggleLikeAd,
  updateAd,
} from '../controller/estateController';
import { retrieveEstateReviews } from '../controller/reviewController';
import { upload } from '../middleware/multerMiddleware';
import { testingUser } from '../middleware/testingUser';

router.post('/', testingUser, upload.array('media', 6), createAd);
router.get('/', retrieveAllAd);
router.get('/user-ads', retrieveAllUserAd);
router.get('/rent', getRentals);
router.get('/nearby', getNearbyEstates);
router.get('/search', searchEstates);
router.get('/:id', retrieveAd);
router.patch('/:id', testingUser, markAsTaken);
router.put('/update-ad/:id', testingUser, upload.array('media', 6), updateAd);
router.delete('/:id', testingUser, deleteAd);
router.post('/ads/:id/view', incrementAdView);
router.post('/ads/:id/like', testingUser, toggleLikeAd);
router.route('/:id/reviews').get(retrieveEstateReviews);

export default router;
