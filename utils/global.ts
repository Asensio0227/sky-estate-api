import cloudinary from 'cloudinary';
import { Request } from 'express';
import Ads, { estateDocument } from '../models/estateModel';
import User from '../models/userModel';

export let sortOptions: any = {
  newest: '-createdAt',
  oldest: 'createdAt',
  'a-z': 'username',
  'z-a': '-username',
};

export function isValidSortKey(key: any): key is keyof typeof sortOptions {
  return typeof key === 'string' && key in sortOptions;
}

export function queryFilters(req: Request, sort?: string, sortKeys?: string) {
  const sortOptions: any = {
    newest: '-createdAt',
    oldest: 'createdAt',
    'a-z': `${sortKeys}`,
    'z-a': `-${sortKeys}`,
  };

  if (typeof sort !== 'string' || !(sort in sortOptions)) {
    sort = sortOptions.newest;
  }

  const sortParam = isValidSortKey(sort) ? sort : 'string';
  const sortKey = sortOptions[sortParam] || sortOptions.newest;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  return {
    sortKey,
    skip,
    limit,
    page,
  };
}

export function imageUpload(
  file: Express.Multer.File
): Promise<{ url: string; id?: string }> {
  return new Promise((resolve, reject) => {
    try {
      const uploadOptions = {
        resource_type: 'auto' as 'auto',
        overwrite: true,
        folder: 'skybank',
      };

      const uploadStream = cloudinary.v2.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            return reject({ message: error.message || 'Upload failed' });
          }

          if (result && result.secure_url) {
            const { secure_url, public_id } = result;
            return resolve({
              url: secure_url,
              id: public_id,
            });
          }

          return reject({ message: 'Unknown error during upload' });
        }
      );

      uploadStream.end(file.buffer);
    } catch (error: any) {
      reject({ message: error.message || 'Unexpected error during upload' });
    }
  });
}
export const checkFeaturedStatus = (ad: estateDocument) => {
  const now = new Date();
  const createdAtDate = new Date(ad.createdAt);
  const sevenDaysLater = new Date(
    createdAtDate.setDate(createdAtDate.getDate() + 7)
  );

  return now < sevenDaysLater;
};

export async function findAds(
  queryObj: any,
  sortKey: any,
  maxRadius: any,
  userLocation: any,
  userSearchState: any
) {
  let ads = await Ads.find(queryObj)
    .sort(sortKey)
    .skip(userSearchState.skip)
    .limit(userSearchState.limit)
    .populate({
      path: 'user',
      select: 'username avatar contact_details lastSeen status',
    });

  await Promise.all(
    ads.map(async (ad: estateDocument) => {
      ad.featured = checkFeaturedStatus(ad);
      await ad.save();
    })
  );

  while (ads.length === 0 && userSearchState.currentRadius <= maxRadius) {
    const expandedQueryObj = {
      location: {
        $geoWithin: {
          $centerSphere: [userLocation, userSearchState.currentRadius / 6378.1], // Convert km to radians
        },
      },
    };

    ads = await Ads.find(expandedQueryObj)
      .sort(sortKey)
      .skip(userSearchState.skip)
      .limit(userSearchState.limit)
      .populate({ path: 'user', select: 'username avatar contact_details' });

    if (ads.length > 0) {
      return ads;
    }
    userSearchState.currentRadius += 1000;
  }

  return ads;
}

export async function checkIfFirstTimeUser(userId: any) {
  const user = await User.findById(userId);
  return !user?.hasOpenedApp;
}
