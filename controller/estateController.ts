import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { BadRequestError, NotFoundError } from '../errors/custom';
import Ads, { estateDocument } from '../models/estateModel';
import User from '../models/userModel';
import {
  checkFeaturedStatus,
  checkIfFirstTimeUser,
  findAds,
  imageUpload,
  isValidSortKey,
  queryFilters,
} from '../utils/global';

export const createAd = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  req.body.user = userId;
  const numericPrice = Number(req.body.price);
  const numericRentPrice = req.body.rentPrice
    ? Number(req.body.rentPrice)
    : undefined;
  const parsedLocation =
    typeof req.body.location === 'string'
      ? JSON.parse(req.body.location)
      : req.body.location;
  let uris = [];
  const files: any = req.files;

  if (files) {
    for (const file of files) {
      const url = await imageUpload(file);
      uris.push(url);
    }
  }

  const user = await User.findOne({ _id: userId });
  const { contact_details: details }: any = user;
  if (user)
    req.body.contact_details = { ...details, ...req.body.contact_details };
  if (uris.length > 0) req.body.photo = uris;
  if (req.body.price) req.body.price = numericPrice;
  if (req.body.rentPrice) req.body.rentPrice = numericRentPrice;
  req.body.location = parsedLocation;
  const ads = await Ads.create({ ...req.body });

  res.status(StatusCodes.CREATED).json({ ads });
};

export const retrieveAllAd = async (req: Request, res: Response) => {
  let { search, sort, category } = req.query;
  const userId: string | any = req.user?.userId;
  const user = await User.findOne({ _id: userId });

  if (!user || !user.physical_address) {
    throw new BadRequestError('User or address not found');
  }

  let queryObj: any = { taken: false };
  const isFirstTime = await checkIfFirstTimeUser(userId);
  const userLocation = user.userAds_address.coordinates;

  if (typeof category === 'string' && category.trim() !== 'all') {
    queryObj.category = category;
  }

  if (typeof search === 'string' && search.trim()) {
    queryObj.title = new RegExp(search, 'i');
  }

  let filteredAds;

  if (isFirstTime) {
    queryObj = {};
  } else if (
    (typeof search === 'string' && search.trim()) ||
    (typeof category === 'string' && category.trim() !== 'all')
  ) {
    filteredAds = await Ads.find(queryObj).sort('-createdAt');
  } else {
    queryObj = {
      location: {
        $geoWithin: {
          $centerSphere: [userLocation, 50 / 6378.1], // Radius in radians (50 km)
        },
      },
    };
  }

  const sortKeys = 'title';
  const sortParam = isValidSortKey(sort) ? sort : 'string';
  const { sortKey, skip, limit, page } = queryFilters(req, sortParam, sortKeys);

  let maxRadius = 500000;
  let initialRadius = 200;
  let userSearchState = {
    currentRadius: initialRadius,
    skip,
    limit,
  };
  const ads = await findAds(
    queryObj,
    sortKey,
    maxRadius,
    userLocation,
    userSearchState
  );
  userSearchState.currentRadius = initialRadius; // Reset radius for new search
  const totalAds = await Ads.countDocuments(queryObj);
  const numOfPages = Math.ceil(totalAds / limit);

  if (Object.keys(queryObj).length === 0) {
    await User.updateOne({ _id: userId }, { hasOpenedApp: true });
  }
  res
    .status(StatusCodes.OK)
    .json({ totalAds, numOfPages, filteredAds, page, ads });
};

export const retrieveAllUserAd = async (req: Request, res: Response) => {
  let { search, sort, category } = req.query;
  let queryObj: any = {
    user: req.user?.userId,
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
    .populate({
      path: 'user',
      select: 'username avatar email lastSeen status',
    });

  await Promise.all(
    ads.map(async (ad: estateDocument) => {
      ad.featured = checkFeaturedStatus(ad);
      await ad.save();
    })
  );

  const totalAds = await Ads.countDocuments(queryObj);
  const numOfPages = Math.ceil(totalAds / limit);
  res.status(StatusCodes.OK).json({ totalAds, numOfPages, ads, page });
};

export const retrieveAd = async (req: Request, res: Response) => {
  const ad = await Ads.findOne({ _id: req.params.id }).populate([
    'reviews',
    { path: 'user', select: 'username avatar email status lastSeen' },
  ]);

  if (!ad) {
    throw new NotFoundError(`No ad with id : ${req.params.id}`);
  }

  res.status(StatusCodes.OK).json({ ad });
};

export const updateAd = async (req: Request, res: Response) => {
  const newAd = { ...req.body };
  const id = req.params.id;
  const numericPrice = newAd.price ? Number(newAd.price) : undefined;
  const numericRentPrice = newAd.rentPrice
    ? Number(newAd.rentPrice)
    : undefined;
  const ad = await Ads.findOne({ _id: id });
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
  const { contact_details: details }: any = user;

  if (newAd.contact_details)
    ad.contact_details = { ...details, ...newAd.contact_details };

  if (uris.length > 0) ad.photo = uris;
  if (newAd.location) {
    ad.location =
      typeof newAd.location === 'string'
        ? JSON.parse(newAd.location)
        : newAd.location;
  }
  if (newAd.title) ad.title = newAd.title;
  if (newAd.description) ad.description = newAd.description;
  if (numericPrice !== undefined) ad.price = numericPrice;
  if (numericRentPrice !== undefined) ad.rentPrice = numericRentPrice;
  if (newAd.rentFrequency) ad.rentFrequency = newAd.rentFrequency;
  if (newAd.depositAmount !== undefined) ad.depositAmount = newAd.depositAmount;
  if (newAd.availableFrom) ad.availableFrom = new Date(newAd.availableFrom);
  if (newAd.isFurnished !== undefined) ad.isFurnished = newAd.isFurnished;
  if (newAd.minimumStay !== undefined) ad.minimumStay = newAd.minimumStay;
  if (newAd.listingType) ad.listingType = newAd.listingType;
  if (newAd.taken !== undefined) ad.taken = newAd.taken;
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

export const markAsTaken = async (req: Request, res: Response) => {
  const { id } = req.params;
  const ad = await Ads.findOne({ _id: id });
  if (!ad) {
    throw new NotFoundError(`No ad with id : ${req.params.id}`);
  }
  ad.taken = !ad.taken;
  await ad.save();
  res.status(StatusCodes.OK).json({ msg: 'Success!', ad });
};

export const getRentals = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const user = await User.findOne({ _id: userId });
  if (!user) throw new NotFoundError('User not found');

  const userLocation =
    user.currentLocation?.coordinates || user.userAds_address.coordinates;
  const { distance = 10, page = 1, limit = 20 } = req.query;

  const pipeline = [
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: userLocation,
        },
        distanceField: 'distance',
        maxDistance: Number(distance) * 1000,
        spherical: true,
      },
    },
    {
      $match: {
        listingType: 'rent',
        taken: false,
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user',
        pipeline: [{ $project: { username: 1, avatar: 1 } }],
      },
    },
    {
      $unwind: '$user',
    },
    {
      $facet: {
        ads: [
          { $skip: (Number(page) - 1) * Number(limit) },
          { $limit: Number(limit) },
        ],
        total: [{ $count: 'count' }],
      },
    },
  ];

  const result = await Ads.aggregate(pipeline as any[]);

  const ads = result[0]?.ads || [];
  const total = result[0]?.total[0]?.count || 0;
  const numOfPages = Math.ceil(total / Number(limit));

  res.status(StatusCodes.OK).json({ ads, total, numOfPages, page });
};

export const getNearbyEstates = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const user = await User.findOne({ _id: userId });
  if (!user) throw new NotFoundError('User not found');

  const userLocation =
    user.currentLocation?.coordinates || user.userAds_address.coordinates;
  const { distance = 10, page = 1, limit = 20 } = req.query;

  const pipeline = [
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: userLocation,
        },
        distanceField: 'distance',
        maxDistance: Number(distance) * 1000,
        spherical: true,
      },
    },
    {
      $match: {
        taken: false,
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user',
        pipeline: [{ $project: { username: 1, avatar: 1 } }],
      },
    },
    {
      $unwind: '$user',
    },
    {
      $facet: {
        ads: [
          { $skip: (Number(page) - 1) * Number(limit) },
          { $limit: Number(limit) },
        ],
        total: [{ $count: 'count' }],
      },
    },
  ];

  const result = await Ads.aggregate(pipeline as any[]);

  const ads = result[0]?.ads || [];
  const total = result[0]?.total[0]?.count || 0;
  const numOfPages = Math.ceil(total / Number(limit));

  res.status(StatusCodes.OK).json({ ads, total, numOfPages, page });
};

export const searchEstates = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const user = await User.findOne({ _id: userId });
  if (!user) throw new NotFoundError('User not found');

  const {
    listingType,
    minPrice,
    maxPrice,
    rentFrequency,
    isFurnished,
    availableFrom,
    distance = 10,
    latitude,
    longitude,
    page = 1,
    limit = 20,
  } = req.query;

  const userLocation =
    latitude && longitude
      ? [Number(longitude), Number(latitude)]
      : user.currentLocation?.coordinates || user.userAds_address.coordinates;

  // Build match conditions
  let matchConditions: any = { taken: false };

  if (listingType) matchConditions.listingType = listingType;
  if (minPrice || maxPrice) {
    const priceField = listingType === 'rent' ? 'rentPrice' : 'price';
    matchConditions[priceField] = {};
    if (minPrice) matchConditions[priceField].$gte = Number(minPrice);
    if (maxPrice) matchConditions[priceField].$lte = Number(maxPrice);
  }
  if (rentFrequency) matchConditions.rentFrequency = rentFrequency;
  if (isFurnished !== undefined)
    matchConditions.isFurnished = isFurnished === 'true';
  if (availableFrom)
    matchConditions.availableFrom = { $lte: new Date(availableFrom as string) };

  const pipeline = [
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: userLocation,
        },
        distanceField: 'distance',
        maxDistance: Number(distance) * 1000,
        spherical: true,
      },
    },
    {
      $match: matchConditions,
    },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user',
        pipeline: [{ $project: { username: 1, avatar: 1 } }],
      },
    },
    {
      $unwind: '$user',
    },
    {
      $facet: {
        ads: [
          { $skip: (Number(page) - 1) * Number(limit) },
          { $limit: Number(limit) },
        ],
        total: [{ $count: 'count' }],
      },
    },
  ];

  const result = await Ads.aggregate(pipeline as any[]);

  const ads = result[0]?.ads || [];
  const total = result[0]?.total[0]?.count || 0;
  const numOfPages = Math.ceil(total / Number(limit));

  res.status(StatusCodes.OK).json({ ads, total, numOfPages, page });
};
