import cloudinary from 'cloudinary';
import { Request } from 'express';
import { estateDocument } from '../models/estateModel';

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
  const limit = Number(req.query.limit) || 10;
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
): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    try {
      const uploadOptions: any = {
        resource_type: 'auto',
        overwrite: true,
        folder: 'skybank',
      };
      cloudinary.v2.uploader
        .upload_stream(uploadOptions, (error, result) => {
          if (result && result.secure_url) {
            const { secure_url } = result;
            resolve({
              url: secure_url,
            });
          }
          return reject({ message: error });
        })
        .end(file.buffer);
    } catch (error: any) {
      console.log(error);
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
