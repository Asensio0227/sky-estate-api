import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { BadRequestError, NotFoundError } from '../errors/custom';
import { default as Ads, default as Estate } from '../models/estateModel';
import Review from '../models/reviewModel';
import { checkPermissions } from '../utils/checkPermissions';
import { queryFilters } from '../utils/global';

export const createReview = async (req: Request, res: Response) => {
  const { estate: houseId } = req.body;
  const isValidEstate = await Estate.findOne({ _id: houseId });

  if (!isValidEstate) {
    throw new NotFoundError('No house found.');
  }

  const alreadySubmitted = await Review.findOne({
    estate: houseId,
    user: req.user?.userId,
  });

  if (alreadySubmitted) {
    throw new BadRequestError('Already submitted review for ths house.');
  }

  req.body.user = req.user?.userId;
  req.body.title = isValidEstate.title;
  const review = await Review.create(req.body);
  res.status(StatusCodes.CREATED).json({ review });
};

export const retrieveAllReview = async (req: Request, res: Response) => {
  const { limit, skip, page } = queryFilters(req);
  const review = await Review.find({})
    .sort('-createdAt')
    .limit(limit)
    .skip(skip)
    .populate([
      { path: 'user', select: 'first_name last_name avatar' },
      {
        path: 'estate',
        select:
          'title photo contact_details location _id taken category average_rating numOfReviews featured price description location',
      },
    ]);
  const totalReviews = review.length;
  const numOfPages = Math.ceil(totalReviews / limit);
  res.status(StatusCodes.OK).json({ page, numOfPages, totalReviews, review });
};

export const retrieveReview = async (req: Request, res: Response) => {
  const { id: reviewId } = req.params;
  const review = await Review.findOne({ _id: reviewId }).populate([
    { path: 'user', select: 'first_name last_name avatar' },
    { path: 'estate', select: 'title photo contact_details location' },
  ]);

  if (!review) {
    throw new NotFoundError('No review found.');
  }

  res.status(StatusCodes.OK).json({ review });
};

export const updateReview = async (req: Request, res: Response) => {
  const { id: reviewId } = req.params;
  const { rating, title, comment } = req.body;
  const review = await Review.findOne({ _id: reviewId });

  if (!review) {
    throw new NotFoundError('No review found.');
  }

  if (review && typeof review.user === 'string') {
    checkPermissions(req.user, review.user);
  } else if (review && typeof review.user === 'object' && review._id !== null) {
    checkPermissions(req.user, review.user.toString());
  } else {
    throw new NotFoundError('User not found or invalid ID');
  }

  if (rating) review.rating = rating;
  if (title) review.title = title;
  if (comment) review.comment = comment;
  await review.save();

  res.status(StatusCodes.OK).json({ review, msg: 'Success! Review updated.' });
};

export const removeReview = async (req: Request, res: Response) => {
  const { id: reviewId } = req.params;
  const review = await Review.findOne({ _id: reviewId });

  if (!review) {
    throw new NotFoundError('No review found.');
  }
  if (review && typeof review.user === 'string') {
    checkPermissions(req.user, review.user);
  } else if (review && typeof review.user === 'object' && review._id !== null) {
    checkPermissions(req.user, review.user.toString());
  } else {
    throw new NotFoundError('User not found or invalid ID');
  }

  await review.deleteOne();
  res.status(StatusCodes.CREATED).json({ msg: 'Success! Review removed.' });
};

export const retrieveEstateReviews = async (req: Request, res: Response) => {
  const { id: houseId } = req.params;
  const { page, limit, skip } = queryFilters(req);
  const ad = await Ads.findOne({ _id: houseId });
  const reviews = await Review.find({ estate: houseId })
    .sort('-createdAt')
    .limit(limit)
    .skip(skip)
    .populate([
      { path: 'estate', select: 'photo title price ' },
      { path: 'user', select: 'username avatar' },
    ]);
  res
    .status(StatusCodes.CREATED)
    .json({ ad, reviews, count: reviews.length, page });
};
