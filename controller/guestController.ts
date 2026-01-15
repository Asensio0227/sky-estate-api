// guestController.ts
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { NotFoundError } from '../errors/custom';
import Ads from '../models/estateModel';
import { isValidSortKey, queryFilters } from '../utils/global';

// Helper function to validate coordinates
const isValidCoordinates = (coordinates: number[]): boolean => {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return false;
  }
  const [longitude, latitude] = coordinates;
  return (
    typeof longitude === 'number' &&
    typeof latitude === 'number' &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90 &&
    !isNaN(longitude) &&
    !isNaN(latitude)
  );
};

const getAllEstates = async (
  page: number,
  limit: number,
  matchConditions: any = {}
) => {
  const skip = (Number(page) - 1) * Number(limit);

  const baseQuery = { taken: false, ...matchConditions };

  const ads = await Ads.find(baseQuery)
    .sort('-createdAt')
    .skip(skip)
    .limit(Number(limit))
    .populate({
      path: 'user',
      select: 'username avatar email',
    })
    .lean();

  const total = await Ads.countDocuments(baseQuery);
  const numOfPages = Math.ceil(total / Number(limit));

  return { ads, total, numOfPages };
};

export const guestRetrieveAllAd = async (req: Request, res: Response) => {
  let { search, sort, category, page = 1, limit = 20 } = req.query;

  let queryObj: any = { taken: false };

  if (typeof category === 'string' && category.trim() !== 'all') {
    queryObj.category = category;
  }

  if (typeof search === 'string' && search.trim()) {
    queryObj.title = new RegExp(search, 'i');
  }

  const sortKeys = 'title';
  const sortParam = isValidSortKey(sort) ? sort : 'string';
  const {
    sortKey,
    skip,
    limit: limitNum,
  } = queryFilters(req, sortParam, sortKeys);

  const ads = await Ads.find(queryObj)
    .sort(sortKey)
    .skip(skip)
    .limit(limitNum)
    .populate({
      path: 'user',
      select: 'username avatar email',
    });

  const totalAds = await Ads.countDocuments(queryObj);
  const numOfPages = Math.ceil(totalAds / limitNum);

  res.status(StatusCodes.OK).json({ totalAds, numOfPages, ads, page });
};

export const guestRetrieveAd = async (req: Request, res: Response) => {
  const ad = await Ads.findOne({ _id: req.params.id }).populate([
    'reviews',
    { path: 'user', select: 'username avatar email' },
  ]);

  if (!ad) {
    throw new NotFoundError(`No ad with id : ${req.params.id}`);
  }

  res.status(StatusCodes.OK).json({ ad });
};

export const guestGetNearbyEstates = async (req: Request, res: Response) => {
  const {
    distance = 10,
    page = 1,
    limit = 20,
    listingType,
    minPrice,
    maxPrice,
    furnished,
    bedrooms,
    bathrooms,
    latitude,
    longitude,
    fetchMode = 'all',
  } = req.query;

  // Build match conditions for filters
  let matchConditions: any = { taken: false };

  if (listingType && listingType !== 'all') {
    matchConditions.listingType = listingType;
  }

  if (minPrice || maxPrice) {
    const priceField = listingType === 'rent' ? 'rentPrice' : 'price';
    matchConditions[priceField] = {};
    if (minPrice) matchConditions[priceField].$gte = Number(minPrice);
    if (maxPrice) matchConditions[priceField].$lte = Number(maxPrice);
  }

  if (furnished !== undefined) {
    matchConditions.isFurnished = furnished === 'true';
  }

  if (bedrooms) {
    matchConditions.bedrooms = Number(bedrooms);
  }

  if (bathrooms) {
    matchConditions.bathrooms = Number(bathrooms);
  }

  let ads: any[] = [];
  let total = 0;
  let numOfPages = 0;
  let isNearbyData = false;
  let hasMoreNearby = false;

  // Check if guest provided coordinates
  let userLocation: number[] | undefined;
  if (latitude && longitude) {
    const coords = [Number(longitude), Number(latitude)];
    if (isValidCoordinates(coords)) {
      userLocation = coords;
    }
  }

  const hasValidLocation = userLocation && isValidCoordinates(userLocation);

  // Try geo query if location is provided and fetchMode is 'nearby'
  if (fetchMode === 'nearby' && hasValidLocation) {
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
          key: 'location',
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
          pipeline: [
            {
              $project: {
                username: 1,
                avatar: 1,
                email: 1,
              },
            },
          ],
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

    try {
      const result = await Ads.aggregate(pipeline as any[]);
      ads = result[0]?.ads || [];
      total = result[0]?.total[0]?.count || 0;
      numOfPages = Math.ceil(total / Number(limit));
      if (ads.length > 0) {
        isNearbyData = true;
        hasMoreNearby = Number(page) < numOfPages;
      }
    } catch (geoError) {
      console.error('Geo query failed:', geoError);
    }
  }

  // Fallback: fetch all estates if no nearby results or fetchMode is 'all'
  if (fetchMode === 'all' || (fetchMode === 'nearby' && ads.length === 0)) {
    const fallbackData = await getAllEstates(
      Number(page),
      Number(limit),
      matchConditions
    );
    ads = fallbackData.ads;
    total = fallbackData.total;
    numOfPages = fallbackData.numOfPages;
    isNearbyData = false;
    hasMoreNearby = false;
  }

  const response = {
    ads,
    total,
    numOfPages,
    page: Number(page),
    isNearbyData,
    hasMoreNearby,
  };

  res.status(StatusCodes.OK).json(response);
};

export const guestGetRentals = async (req: Request, res: Response) => {
  const {
    distance = 10,
    page = 1,
    limit = 20,
    minPrice,
    maxPrice,
    furnished,
    bedrooms,
    bathrooms,
    latitude,
    longitude,
  } = req.query;

  let matchConditions: any = {
    listingType: 'rent',
    taken: false,
  };

  if (minPrice || maxPrice) {
    matchConditions.rentPrice = {};
    if (minPrice) matchConditions.rentPrice.$gte = Number(minPrice);
    if (maxPrice) matchConditions.rentPrice.$lte = Number(maxPrice);
  }

  if (furnished !== undefined) {
    matchConditions.isFurnished = furnished === 'true';
  }

  if (bedrooms) matchConditions.bedrooms = Number(bedrooms);
  if (bathrooms) matchConditions.bathrooms = Number(bathrooms);

  let ads: any[] = [];
  let total = 0;
  let numOfPages = 0;

  // Check if guest provided coordinates
  let userLocation: number[] | undefined;
  if (latitude && longitude) {
    const coords = [Number(longitude), Number(latitude)];
    if (isValidCoordinates(coords)) {
      userLocation = coords;
    }
  }

  const hasValidLocation = userLocation && isValidCoordinates(userLocation);

  // Try geo query if location is provided
  if (hasValidLocation) {
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
          key: 'location',
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
          pipeline: [
            {
              $project: {
                username: 1,
                avatar: 1,
                email: 1,
              },
            },
          ],
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

    try {
      const result = await Ads.aggregate(pipeline as any[]);
      ads = result[0]?.ads || [];
      total = result[0]?.total[0]?.count || 0;
      numOfPages = Math.ceil(total / Number(limit));
    } catch (geoError) {
      console.error('Geo query failed for rentals:', geoError);
    }
  }

  // Fallback: fetch all rentals
  if (ads.length === 0) {
    const fallbackData = await getAllEstates(
      Number(page),
      Number(limit),
      matchConditions
    );
    ads = fallbackData.ads;
    total = fallbackData.total;
    numOfPages = fallbackData.numOfPages;
  }

  res.status(StatusCodes.OK).json({ ads, total, numOfPages, page });
};

export const guestSearchEstates = async (req: Request, res: Response) => {
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
    bedrooms,
    bathrooms,
  } = req.query;

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
    matchConditions.availableFrom = {
      $lte: new Date(availableFrom as string),
    };
  if (bedrooms) matchConditions.bedrooms = Number(bedrooms);
  if (bathrooms) matchConditions.bathrooms = Number(bathrooms);

  let ads: any[] = [];
  let total = 0;
  let numOfPages = 0;

  // Check if guest provided coordinates
  let userLocation: number[] | undefined;
  if (latitude && longitude) {
    const coords = [Number(longitude), Number(latitude)];
    if (isValidCoordinates(coords)) {
      userLocation = coords;
    }
  }

  const hasValidLocation = userLocation && isValidCoordinates(userLocation);

  // Try geo query if location is provided
  if (hasValidLocation) {
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
          key: 'location',
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
          pipeline: [
            {
              $project: {
                username: 1,
                avatar: 1,
                email: 1,
              },
            },
          ],
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

    try {
      const result = await Ads.aggregate(pipeline as any[]);
      ads = result[0]?.ads || [];
      total = result[0]?.total[0]?.count || 0;
      numOfPages = Math.ceil(total / Number(limit));
    } catch (geoError) {
      console.error('Geo query failed for search:', geoError);
    }
  }

  // Fallback: fetch all estates matching filters
  if (ads.length === 0) {
    const fallbackData = await getAllEstates(
      Number(page),
      Number(limit),
      matchConditions
    );
    ads = fallbackData.ads;
    total = fallbackData.total;
    numOfPages = fallbackData.numOfPages;
  }

  res.status(StatusCodes.OK).json({ ads, total, numOfPages, page });
};
