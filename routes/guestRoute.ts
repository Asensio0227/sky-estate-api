// guestRoute.ts
import express from 'express';
const router = express.Router();

import {
  guestGetNearbyEstates,
  guestGetRentals,
  guestRetrieveAd,
  guestRetrieveAllAd,
  guestSearchEstates,
} from '../controller/guestController';
import { retrieveEstateReviews } from '../controller/reviewController';

// Public routes - no authentication required
router.get('/', guestRetrieveAllAd);
router.get('/rent', guestGetRentals);
router.get('/nearby', guestGetNearbyEstates);
router.get('/search', guestSearchEstates);
router.get('/:id', guestRetrieveAd);
router.get('/:id/reviews', retrieveEstateReviews);

export default router;
