import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from '../errors/custom';
import User from '../models/userModel';
import { checkPermissions } from '../utils/checkPermissions';
import { imageUpload, isValidSortKey, queryFilters } from '../utils/global';

interface QueryObject {
  isVerified: boolean;
  role?: string;
  banned?: any | boolean;
  [key: string]: any; // This allows for additional properties
}

export const getAllUsers = async (req: Request, res: Response) => {
  let { search, sort, role, banned } = req.query;
  let queryObj: QueryObject = { isVerified: true };

  if (typeof role === 'string' && role.trim() !== 'all') {
    queryObj.role = role;
  }

  if (banned) {
    queryObj.banned = banned;
  }

  if (search) {
    queryObj['$or'] = [
      { first_name: { $regex: search, $options: 'i' } },
      { last_name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { username: { $regex: search, $options: 'i' } },
    ];
  }
  const sortKeys = 'username';
  const sortParam = isValidSortKey(sort) ? sort : 'string';
  const { sortKey, skip, limit, page } = queryFilters(req, sortParam, sortKeys);
  const users = await User.find(queryObj)
    .select('-password')
    .sort(sortKey)
    .skip(skip)
    .limit(limit);
  const totalUsers = await User.countDocuments(queryObj);
  const numOfPages = Math.ceil(totalUsers / limit);
  res.status(StatusCodes.OK).json({ totalUsers, numOfPages, users, page });
};

export const showMeUser = async (req: Request, res: Response) => {
  const user = await User.findById(req.user?.userId).select(
    '-password -isVerified -verificationToken -verified '
  );
  res.status(StatusCodes.OK).json({ user });
};

export const getSingleUser = async (req: Request, res: Response) => {
  const { id }: { id?: string } = req.params;

  if (!id) {
    throw new BadRequestError('Invalid credentials!');
  }

  const user = await User.findById(id).select('-password');

  if (!user) {
    throw new NotFoundError('No user found!');
  }

  res.status(StatusCodes.OK).json({ user });
};

export const updateUser = async (req: Request, res: Response) => {
  const newUser = { ...req.body };
  delete newUser.password;
  delete newUser.roles;

  if (!newUser) {
    throw new BadRequestError('Please provide all values');
  }

  let id;
  if (req.user && typeof req.user.userId === 'string') {
    id = req.user?.userId;
  }

  const user = await User.findOne({ _id: id });

  if (user && typeof user._id === 'string') {
    checkPermissions(req.user, user._id);
  } else if (user && typeof user._id === 'object' && user._id !== null) {
    checkPermissions(req.user, user._id.toString());
  } else {
    throw new NotFoundError('User not found or invalid ID');
  }

  // ✅ Handle file upload
  if (req.file) {
    try {
      const file = req.file;
      const { url } = await imageUpload(file);
      newUser.avatar = url;
    } catch (error: any) {
      throw new BadRequestError(`Cloudinary upload error, ${error.message}`);
    }
  }

  // ✅ Update basic fields
  if (newUser.avatar) user.avatar = newUser.avatar;
  if (newUser.gender) user.gender = newUser.gender;
  if (newUser.username) user.username = newUser.username;
  if (newUser.date_of_birth) user.date_of_birth = newUser.date_of_birth;
  if (newUser.email) user.email = newUser.email;
  if (newUser.last_name) user.last_name = newUser.last_name;
  if (newUser.lastSeen) user.lastSeen = newUser.lastSeen;
  if (newUser.first_name) user.first_name = newUser.first_name;
  if (newUser.ideaNumber) user.ideaNumber = newUser.ideaNumber;

  // ✅ Handle userAds_address
  if (newUser.userAds_address) {
    let parsedAddress = newUser.userAds_address;
    if (typeof newUser.userAds_address === 'string') {
      if (
        newUser.userAds_address !== 'undefined' &&
        newUser.userAds_address !== '[object Object]'
      ) {
        try {
          parsedAddress = JSON.parse(newUser.userAds_address);
        } catch (error) {
          throw new BadRequestError('Invalid userAds_address format');
        }
      }
    }
    user.userAds_address = parsedAddress;
  }

  // ✅ Handle physical_address - Parse JSON string
  if (newUser.physical_address) {
    let physicalAddress = newUser.physical_address;

    // If it's a string, parse it
    if (typeof newUser.physical_address === 'string') {
      try {
        physicalAddress = JSON.parse(newUser.physical_address);
      } catch (error) {
        throw new BadRequestError('Invalid physical_address format');
      }
    }

    user.physical_address = physicalAddress;
  }

  // ✅ Handle contact_details - Parse JSON string
  if (newUser.contact_details) {
    let contactDetails = newUser.contact_details;

    // If it's a string, parse it
    if (typeof newUser.contact_details === 'string') {
      try {
        contactDetails = JSON.parse(newUser.contact_details);
      } catch (error) {
        throw new BadRequestError('Invalid contact_details format');
      }
    }

    user.contact_details = contactDetails;
  }

  await user.save();

  res.status(StatusCodes.OK).json({ user });
};

export const actionUser = async (req: Request, res: Response) => {
  const { ban, role } = req.body;

  const user = await User.findOne({ _id: req.params.id }).select(
    '-password -passwordToken -passwordTokenExpirationDate'
  );

  if (!user) {
    throw new UnauthorizedError('No user found');
  }

  if (ban) user.banned = ban;
  if (role) user.role = role;
  await user.save;

  res.status(StatusCodes.OK).json({ user });
};

export const updatePassword = async (req: Request, res: Response) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new BadRequestError('Please provide all values');
  }

  const user = await User.findOne({ _id: req.user?.userId });
  const isPasswordCorrect = await user?.ComparePassword(oldPassword);

  if (!isPasswordCorrect) {
    throw new UnauthorizedError('Invalid credentials');
  }

  if (user && typeof user._id === 'string') {
    checkPermissions(req.user, user._id);
  } else if (user && typeof user._id === 'object' && user._id !== null) {
    checkPermissions(req.user, user._id.toString());
  } else {
    throw new NotFoundError('User not found or invalid ID');
  }

  user.password = newPassword;
  await user.save();

  res
    .status(StatusCodes.OK)
    .json({ user, msg: 'Password updated successfully.' });
};

export const updateLocation = async (req: Request, res: Response) => {
  const { latitude, longitude } = req.body;
  const userId = req.user?.userId;

  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User not found');

  user.currentLocation = {
    type: 'Point',
    coordinates: [longitude, latitude],
  };

  await user.save();

  res
    .status(StatusCodes.OK)
    .json({ msg: 'Location updated successfully', user });
};

export const updateManualLocation = async (req: Request, res: Response) => {
  const { latitude, longitude } = req.body;
  const userId = req.user?.userId;

  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User not found');

  // Manual override, same as updateLocation for now
  user.currentLocation = {
    type: 'Point',
    coordinates: [longitude, latitude],
  };

  await user.save();

  res
    .status(StatusCodes.OK)
    .json({ msg: 'Manual location updated successfully', user });
};
