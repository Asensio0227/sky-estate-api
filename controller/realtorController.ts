import { Request, Response } from 'express';
import { AuthRequest } from '../types/express';
import { StatusCodes } from 'http-status-codes';
import Joi from 'joi';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../errors/custom';
import User from '../models/userModel';
import { imageUpload } from '../utils/global';

// ─── Validation Schema ────────────────────────────────────────────────────────

const applySchema = Joi.object({
  licenseNumber: Joi.string().trim().min(3).max(50).required().messages({
    'string.empty': 'License number is required',
    'any.required': 'License number is required',
  }),
  agencyName: Joi.string().trim().max(100).optional().allow(''),
  experience: Joi.string().trim().max(500).optional().allow(''),
});

// ─── 1. Apply to Become a Realtor ─────────────────────────────────────────────

export const applyForRealtor = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;

  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User not found');

  // Only 'user' or 'member' roles may apply
  if (user.role !== 'user' && user.role !== 'member') {
    throw new UnauthorizedError(
      'Only users with role "user" or "member" can apply to become a realtor',
    );
  }

  // Block duplicate applications
  if (user.realtorStatus === 'pending') {
    throw new BadRequestError(
      'You already have a pending application. Please wait for admin review.',
    );
  }
  if (user.realtorStatus === 'approved') {
    throw new BadRequestError('You are already an approved realtor.');
  }

  // Validate body fields
  const { error, value } = applySchema.validate(req.body, { abortEarly: false });
  if (error) {
    const message = error.details.map((d) => d.message).join(', ');
    throw new BadRequestError(message);
  }

  // Handle document uploads (optional, multipart)
  let documentUrls: string[] = [];
  const files = req.files as Express.Multer.File[] | undefined;
  if (files && files.length > 0) {
    const results = await Promise.all(files.map((file) => imageUpload(file)));
    documentUrls = results.map((r) => r.url);
  }

  user.realtorStatus = 'pending';
  user.realtorApplication = {
    licenseNumber: value.licenseNumber,
    agencyName: value.agencyName,
    experience: value.experience,
    documents: documentUrls,
    submittedAt: new Date(),
  };

  await user.save();

  res.status(StatusCodes.OK).json({
    msg: 'Application submitted successfully. You will be notified once reviewed.',
    realtorStatus: user.realtorStatus,
    realtorApplication: user.realtorApplication,
  });
};

// ─── 2. Get My Application Status ─────────────────────────────────────────────

export const getMyRealtorStatus = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;

  const user = await User.findById(userId).select(
    'realtorStatus realtorApplication role',
  );
  if (!user) throw new NotFoundError('User not found');

  res.status(StatusCodes.OK).json({
    realtorStatus: user.realtorStatus,
    realtorApplication: user.realtorApplication ?? null,
    role: user.role,
  });
};

// ─── 3. Admin: Get All Applications ───────────────────────────────────────────

export const getAllRealtorApplications = async (req: AuthRequest, res: Response) => {
  const { status } = req.query;

  const validStatuses = ['pending', 'approved', 'rejected', 'none'];
  const queryObj: any = {};

  if (status && typeof status === 'string') {
    if (!validStatuses.includes(status)) {
      throw new BadRequestError(
        `Invalid status filter. Must be one of: ${validStatuses.join(', ')}`,
      );
    }
    queryObj.realtorStatus = status;
  } else {
    // Default: return pending applications
    queryObj.realtorStatus = 'pending';
  }

  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const [applications, total] = await Promise.all([
    User.find(queryObj)
      .select(
        'first_name last_name email username role realtorStatus realtorApplication createdAt',
      )
      .sort('-realtorApplication.submittedAt')
      .skip(skip)
      .limit(limit),
    User.countDocuments(queryObj),
  ]);

  const numOfPages = Math.ceil(total / limit);

  res.status(StatusCodes.OK).json({
    count: total,
    numOfPages,
    page,
    applications,
  });
};

// ─── 4. Admin: Approve Application ────────────────────────────────────────────

export const approveRealtorApplication = async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;

  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User not found');

  if (user.realtorStatus !== 'pending') {
    throw new BadRequestError(
      `Cannot approve: application status is "${user.realtorStatus}", expected "pending".`,
    );
  }

  user.role = 'realtor';
  user.realtorStatus = 'approved';
  await user.save();

  res.status(StatusCodes.OK).json({
    msg: `User ${user.username} has been approved as a realtor.`,
    userId: user._id,
    role: user.role,
    realtorStatus: user.realtorStatus,
  });
};

// ─── 5. Admin: Reject Application ─────────────────────────────────────────────

export const rejectRealtorApplication = async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;

  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User not found');

  if (user.realtorStatus !== 'pending') {
    throw new BadRequestError(
      `Cannot reject: application status is "${user.realtorStatus}", expected "pending".`,
    );
  }

  // Role stays as-is ('user' or 'member') — only status changes
  user.realtorStatus = 'rejected';
  await user.save();

  res.status(StatusCodes.OK).json({
    msg: `Application for user ${user.username} has been rejected. They may reapply.`,
    userId: user._id,
    realtorStatus: user.realtorStatus,
  });
};
