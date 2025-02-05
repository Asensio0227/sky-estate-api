import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { BadRequestError, NotFoundError } from '../errors/custom';
import Ads from '../models/estateModel';
import User from '../models/userModel';
import { imageUpload, isValidSortKey, queryFilters } from '../utils/global';

export const createAd = async (req: Request, res: Response) => {
  req.body.user = req.user?.userId;
  let uris = [];
  const files: any = req.files;

  if (files) {
    for (const file of files) {
      const url = await imageUpload(file);
      uris.push(url);
    }
  }

  const user = await User.findOne({ _id: req.user?.userId });
  if (user) req.body.contact_details = user.contact_details;
  if (uris.length > 0) req.body.photo = uris;
  const ads = await Ads.create(req.body);
  res.status(StatusCodes.CREATED).json({ ads });
};

export const retrieveAllAd = async (req: Request, res: Response) => {
  let { search, sort, category } = req.query;
  const user = await User.findOne({ _id: req.user?.userId });

  // if (!user || !user.address) {
  //   throw new BadRequestError('User or address not found');
  // }

  // const userLocation = user.userAds_address.coordinates;
  let queryObj: any = {
    // location: {
    //   $geoWithin: {
    //     $centerSphere: [userLocation, 50 / 6378.1], // Radius in radians (50 km)
    //   },
    // },
  };

  if (typeof category === 'string' && category.trim() !== 'all') {
    queryObj.category = category;
  }

  if (typeof search === 'string' && search.trim()) {
    queryObj.title = new RegExp(search, 'i');
  }

  const sortKeys = 'title';
  const sortParam = isValidSortKey(sort) ? sort : 'string';
  const { sortKey, skip, limit, page } = queryFilters(req, sortParam, sortKeys);
  let ads = await Ads.find(queryObj)
    .sort(sortKey)
    .skip(skip)
    .limit(limit)
    .populate({ path: 'user', select: 'username avatar' });

  let maxRadius = 500000;
  let currentRadius = 200;

  while (ads.length === 0 && currentRadius <= maxRadius) {
    const expandedQueryObj: any = {
      // location: {
      //   $geoWithin: {
      //     $centerSphere: [userLocation, currentRadius / 6378.1], // Convert km to radians
      //   },
      // },
    };

    ads = await Ads.find(expandedQueryObj)
      .sort(sortKey)
      .skip(skip)
      .limit(limit);

    currentRadius += 100;
  }

  const totalAds = await Ads.countDocuments(queryObj);
  const numOfPages = Math.ceil(totalAds / limit);
  res.status(StatusCodes.OK).json({ totalAds, numOfPages, ads, page });
};

export const retrieveAd = async (req: Request, res: Response) => {
  const ad = await Ads.findOne({ _id: req.params.id }).populate([
    'reviews',
    { path: 'user', select: 'username avatar' },
  ]);

  if (!ad) {
    throw new NotFoundError(`No ad with id : ${req.params.id}`);
  }

  res.status(StatusCodes.OK).json({ ad });
};

export const updateAd = async (req: Request, res: Response) => {
  const newAd = { ...req.body };
  const id = req.params.id;
  const ad = await Ads.findById(id);

  if (!ad) {
    throw new NotFoundError(`No ad with id : ${req.params.id}`);
  }

  let uris = [];
  const files: any = req.files;

  if (files) {
    for (const file of files) {
      const url = await imageUpload(file);
      uris.push(url);
    }
  }

  const user = await User.findOne({ _id: req.user?.userId });

  if (uris.length > 0) ad.photo = uris;
  if (newAd.location) ad.location = newAd.location;
  if (user) ad.contact_details = user.contact_details;
  if (newAd.title) ad.title = newAd.title;
  if (newAd.description) ad.description = newAd.description;
  if (newAd.price) ad.price = newAd.price;
  if (newAd.category) ad.category = newAd.category;
  await ad.save();

  res.status(StatusCodes.CREATED).json({ ad });
};

export const deleteAd = async (req: Request, res: Response) => {
  const { id } = req.params;

  const ad = await Ads.findById(id);

  if (!ad) {
    throw new NotFoundError(`No ad with id : ${req.params.id}`);
  }

  await ad.deleteOne();
  res.status(StatusCodes.OK).json({ msg: 'Success! ad removed.' });
};
