import { NextFunction, Request, RequestHandler, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { BadRequestError, NotFoundError } from '../errors/custom';
import Ads, { estateDocument, UIEstateDocument } from '../models/estateModel';
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
  let parsedLocation = req.body.location;
  console.log(`====create ad for houses===`);
  console.log(req.body);
  console.log(`====create ad for houses===`);
  if (req.body.location) {
    if (typeof req.body.location === 'string') {
      if (
        req.body.location !== 'undefined' &&
        req.body.location !== '[object Object]'
      ) {
        try {
          parsedLocation = JSON.parse(req.body.location);
        } catch (error) {
          throw new BadRequestError('Invalid location format');
        }
      }
    } else if (typeof req.body.location === 'object') {
      parsedLocation = req.body.location;
    }
  }
  let uris = [];
  const files: any = req.files;
  console.log(`====create ad for houses==req.files===`);
  console.log(req.files);
  console.log(`====create ad for houses===req.files==`);

  if (files) {
    for (const file of files) {
      const url = await imageUpload(file);
      console.log(`====create ad for houses==url===`);
      console.log(url);
      console.log(`====create ad for houses===url==`);
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
          $centerSphere: [userLocation, 50 / 6378.1],
          key: 'location',
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
    let parsedLocation = newAd.location;
    if (typeof newAd.location === 'string') {
      if (
        newAd.location !== 'undefined' &&
        newAd.location !== '[object Object]'
      ) {
        try {
          parsedLocation = JSON.parse(newAd.location);
        } catch (error) {
          throw new BadRequestError('Invalid location format');
        }
      }
    }
    ad.location = parsedLocation;
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
      select: 'username avatar email lastSeen status',
    })
    .lean();

  const total = await Ads.countDocuments(baseQuery);
  const numOfPages = Math.ceil(total / Number(limit));

  return { ads, total, numOfPages };
};

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

// export const getNearbyEstates = async (req: Request, res: Response) => {
//   try {
//     const userId = req.user?.userId;
//     const user = await User.findOne({ _id: userId });

//     if (!user) {
//       throw new NotFoundError('User not found');
//     }

//     const {
//       distance = 10,
//       page = 1,
//       limit = 20,
//       listingType,
//       minPrice,
//       maxPrice,
//       furnished,
//       bedrooms,
//       bathrooms,
//     } = req.query;

//     // Try to get valid user location
//     let userLocation =
//       user.currentLocation?.coordinates || user.userAds_address?.coordinates;

//     // Validate coordinates
//     const hasValidLocation = userLocation && isValidCoordinates(userLocation);

//     // Build match conditions for filters
//     let matchConditions: any = { taken: false };

//     if (listingType) {
//       matchConditions.listingType = listingType;
//     }

//     if (minPrice || maxPrice) {
//       const priceField = listingType === 'rent' ? 'rentPrice' : 'price';
//       matchConditions[priceField] = {};
//       if (minPrice) matchConditions[priceField].$gte = Number(minPrice);
//       if (maxPrice) matchConditions[priceField].$lte = Number(maxPrice);
//     }

//     if (furnished !== undefined) {
//       matchConditions.isFurnished = furnished === 'true';
//     }

//     if (bedrooms) {
//       matchConditions.bedrooms = Number(bedrooms);
//     }

//     if (bathrooms) {
//       matchConditions.bathrooms = Number(bathrooms);
//     }

//     let ads: any[] = [];
//     let total = 0;
//     let numOfPages = 0;

//     // If we have valid location, try geo query first
//     if (hasValidLocation) {
//       const pipeline = [
//         {
//           $geoNear: {
//             near: {
//               type: 'Point',
//               coordinates: userLocation,
//             },
//             distanceField: 'distance',
//             maxDistance: Number(distance) * 1000, // Convert km to meters
//             spherical: true,
//             key: 'location',
//           },
//         },
//         {
//           $match: matchConditions,
//         },
//         {
//           $lookup: {
//             from: 'users',
//             localField: 'user',
//             foreignField: '_id',
//             as: 'user',
//             pipeline: [
//               {
//                 $project: {
//                   username: 1,
//                   avatar: 1,
//                   email: 1,
//                   lastSeen: 1,
//                   status: 1,
//                 },
//               },
//             ],
//           },
//         },
//         {
//           $unwind: '$user',
//         },
//         {
//           $facet: {
//             ads: [
//               { $skip: (Number(page) - 1) * Number(limit) },
//               { $limit: Number(limit) },
//             ],
//             total: [{ $count: 'count' }],
//           },
//         },
//       ];

//       try {
//         const result = await Ads.aggregate(pipeline as any[]);
//         ads = result[0]?.ads || [];
//         total = result[0]?.total[0]?.count || 0;
//         numOfPages = Math.ceil(total / Number(limit));
//       } catch (geoError) {
//         console.error('Geo query failed:', geoError);
//         // Will fall through to fallback
//       }
//     }

//     // Fallback: If no nearby estates found or no valid location, fetch all estates with filters
//     if (ads.length === 0) {
//       const fallbackData = await getAllEstates(
//         Number(page),
//         Number(limit),
//         matchConditions
//       );
//       ads = fallbackData.ads;
//       total = fallbackData.total;
//       numOfPages = fallbackData.numOfPages;
//     }

//     res.status(StatusCodes.OK).json({ ads, total, numOfPages, page });
//   } catch (error) {
//     console.error('Error in getNearbyEstates:', error);
//     throw error;
//   }
// };

export const getRentals = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const user = await User.findOne({ _id: userId });
    if (!user) throw new NotFoundError('User not found');

    const {
      distance = 10,
      page = 1,
      limit = 20,
      minPrice,
      maxPrice,
      furnished,
      bedrooms,
      bathrooms,
    } = req.query;

    // Try to get valid user location
    let userLocation =
      user.currentLocation?.coordinates || user.userAds_address?.coordinates;
    const hasValidLocation = userLocation && isValidCoordinates(userLocation);

    // Build match conditions
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

    // If we have valid location, try geo query first
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
                  lastSeen: 1,
                  status: 1,
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

    // Fallback: fetch all rentals with filters
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
  } catch (error) {
    console.error('Error in getRentals:', error);
    throw error;
  }
};

export const searchEstates = async (req: Request, res: Response) => {
  try {
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
      bedrooms,
      bathrooms,
    } = req.query;

    // Determine location to use
    let userLocation: number[] | undefined;

    if (latitude && longitude) {
      const coords = [Number(longitude), Number(latitude)];
      if (isValidCoordinates(coords)) {
        userLocation = coords;
      }
    }

    if (!userLocation) {
      userLocation =
        user.currentLocation?.coordinates || user.userAds_address?.coordinates;
    }

    const hasValidLocation = userLocation && isValidCoordinates(userLocation);

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

    // If we have valid location, try geo query first
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
                  lastSeen: 1,
                  status: 1,
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

    // Fallback: fetch all estates matching filters without location constraint
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
  } catch (error) {
    console.error('Error in searchEstates:', error);
    throw error;
  }
};

// ============================================
// COMPLETE getNearbyEstates FUNCTION
// ============================================
export const getNearbyEstates = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const user = await User.findOne({ _id: userId });

    if (!user) {
      throw new NotFoundError('User not found');
    }

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
      fetchMode = 'nearby',
    } = req.query;
    // Try to get valid user location
    let userLocation =
      user.currentLocation?.coordinates || user.userAds_address?.coordinates;
    // Validate coordinates
    const hasValidLocation = userLocation && isValidCoordinates(userLocation);
    // Build match conditions for filters
    let matchConditions: any = { taken: false };

    // ✅ Only filter by listingType if it's not 'all'
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
    // ✅ ADD: Count total properties for debugging
    const totalInDb = await Ads.countDocuments({ taken: false });
    const totalMatchingFilter = await Ads.countDocuments(matchConditions);
    let ads: any[] = [];
    let total = 0;
    let numOfPages = 0;
    let isNearbyData = false;
    let hasMoreNearby = false;

    // CRITICAL: Only try geo query if fetchMode is 'nearby' AND we have valid location
    if (fetchMode === 'nearby' && hasValidLocation) {
      const pipeline = [
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: userLocation,
            },
            distanceField: 'distance',
            maxDistance: Number(distance) * 1000, // Convert km to meters
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
                  lastSeen: 1,
                  status: 1,
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
        } else {
          // console.log('⚠️ No properties found within', distance, 'km radius');
        }
      } catch (geoError) {
        console.error('❌ Geo query failed:', geoError);
        // Will fall through to fallback
      }
    } else {
      console.log(
        '🌍 Skipping NEARBY - fetchMode:',
        fetchMode,
        'hasLocation:',
        hasValidLocation
      );
    }

    // Fetch all estates if:
    // 1. fetchMode is 'all', OR
    // 2. No nearby estates found in 'nearby' mode
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
      isNearbyData, // Indicates if data is from nearby search
      hasMoreNearby, // Indicates if there are more nearby results
    };
    res.status(StatusCodes.OK).json(response);
  } catch (error) {
    console.error('❌ Error in getNearbyEstates:', error);
    throw error;
  }
};

// ============================================
// ATOMIC INCREMENT AD VIEW
// ============================================
export const incrementAdView = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id: estateId } = req.params;
    const userId = (req as any).user?.userId;

    // If no userId (guest or unauthenticated), just return current view count
    if (!userId) {
      const estate = await Ads.findById(estateId).select('viewsCount');
      if (!estate) {
        throw new NotFoundError('Estate not found');
      }
      res.status(StatusCodes.OK).json({ viewsCount: estate.viewsCount });
      return;
    }

    // Atomic operation: Only increment if user hasn't viewed before
    const result = await Ads.findOneAndUpdate(
      {
        _id: estateId,
        viewedBy: { $ne: userId }, // Only update if user NOT in viewedBy array
      },
      {
        $addToSet: { viewedBy: userId }, // Add user to viewedBy (no duplicates)
        $inc: { viewsCount: 1 }, // Increment view count
      },
      {
        new: true, // Return updated document
        select: 'viewsCount', // Only return viewsCount field
      }
    );

    if (!result) {
      // Either estate doesn't exist OR user already viewed it
      const estate = await Ads.findById(estateId).select('viewsCount');
      if (!estate) {
        throw new NotFoundError('Estate not found');
      }
      // User already viewed, return current count
      res.status(StatusCodes.OK).json({ viewsCount: estate.viewsCount });
      return;
    }

    res.status(StatusCodes.OK).json({
      viewsCount: result.viewsCount,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// ATOMIC TOGGLE LIKE AD
// ============================================
export const toggleLikeAd = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id: estateId } = req.params;
    const userId = (req as any).user?.userId;

    if (!userId) {
      throw new NotFoundError('User not authenticated');
    }

    // First, check if user already liked the estate
    const estate: any = await Ads.findById(estateId).select('likedBy');

    if (!estate) {
      throw new NotFoundError('Estate not found');
    }

    const isLiked = estate.likedBy.some((id: any) => id.toString() === userId);

    // Single atomic operation based on current state
    const result = await Ads.findByIdAndUpdate(
      estateId,
      isLiked
        ? {
            // UNLIKE: Remove user and decrement count
            $pull: { likedBy: userId },
            $inc: { likeCount: -1 },
          }
        : {
            // LIKE: Add user and increment count
            $addToSet: { likedBy: userId },
            $inc: { likeCount: 1 },
          },
      {
        new: true,
        select: 'likeCount',
      }
    );

    res.status(StatusCodes.OK).json({
      liked: !isLiked,
      likeCount: result?.likeCount || 0,
    });
  } catch (error) {
    next(error);
  }
};
