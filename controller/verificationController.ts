import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import Joi from 'joi';
import { AuthRequest } from '../types/express';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../errors/custom';
import User from '../models/userModel';
import { imageUpload } from '../utils/global';

// ─── Allowed MIME types ───────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

function validateFileMimeType(file: Express.Multer.File, fieldName: string): void {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new BadRequestError(
      `"${fieldName}" must be an image (JPEG/PNG/WebP) or PDF. Received: ${file.mimetype}`,
    );
  }
}

// ─── Validation schema ────────────────────────────────────────────────────────

const submitIdSchema = Joi.object({
  idNumber: Joi.string().trim().min(5).max(30).required().messages({
    'string.empty': 'ID number is required',
    'string.min':   'ID number must be at least 5 characters',
    'string.max':   'ID number must be at most 30 characters',
    'any.required': 'ID number is required',
  }),
});

// ─── 1. POST /user/verify-id ──────────────────────────────────────────────────
// User uploads their government-issued ID document + a live selfie.
// Overwrites any previous (rejected/pending) verification attempt.

export const submitIdVerification = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;

  const user = await User.findById(userId).select(
    'idVerification realtorStatus role',
  );
  if (!user) throw new NotFoundError('User not found');

  // Already approved — no need to re-verify
  if (user.idVerification?.status === 'approved') {
    throw new BadRequestError(
      'Your identity is already verified. No re-submission required.',
    );
  }

  // Active pending submission — prevent spam
  if (user.idVerification?.status === 'pending') {
    throw new BadRequestError(
      'You already have a pending verification. Please wait for admin review.',
    );
  }

  // Validate body
  const { error, value } = submitIdSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const message = error.details.map((d) => d.message).join(', ');
    throw new BadRequestError(message);
  }

  // Files: expect exactly two fields — "document" and "selfie"
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

  const documentFile = files?.document?.[0];
  const selfieFile   = files?.selfie?.[0];

  if (!documentFile) throw new BadRequestError('ID document file is required.');
  if (!selfieFile)   throw new BadRequestError('Selfie photo is required.');

  // MIME-type validation
  validateFileMimeType(documentFile, 'document');
  validateFileMimeType(selfieFile,   'selfie');

  // Upload both files in parallel
  const [documentResult, selfieResult] = await Promise.all([
    imageUpload(documentFile),
    imageUpload(selfieFile),
  ]);

  // Write verification fields — pre-save hook will hash & strip idNumber
  user.idVerification = {
    idNumber:    value.idNumber,   // hashed in pre-save; never stored raw
    document:    documentResult.url,
    selfie:      selfieResult.url,
    status:      'pending',
    submittedAt: new Date(),
    // Clear any previous rejection reason on re-submission
    rejectionReason: undefined,
    reviewedAt:      undefined,
  };

  await user.save();

  res.status(StatusCodes.OK).json({
    msg: 'ID verification submitted successfully. You will be notified once reviewed.',
    status: user.idVerification.status,
    submittedAt: user.idVerification.submittedAt,
  });
};

// ─── 2. GET /admin/id-verifications ──────────────────────────────────────────
// Admin: list all users with idVerification.status = 'pending' (default),
// or any status via ?status= query param.

export const getPendingIdVerifications = async (req: AuthRequest, res: Response) => {
  const validStatuses = ['none', 'pending', 'approved', 'rejected'] as const;
  type VStatus = typeof validStatuses[number];

  const statusParam = req.query.status as string | undefined;
  const statusFilter: VStatus =
    statusParam && validStatuses.includes(statusParam as VStatus)
      ? (statusParam as VStatus)
      : 'pending';

  const page  = Number(req.query.page)  || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const skip  = (page - 1) * limit;

  const query = { 'idVerification.status': statusFilter };

  const [users, total] = await Promise.all([
    User.find(query)
      .select(
        'first_name last_name email username role realtorStatus ' +
        'idVerification.status idVerification.document idVerification.selfie ' +
        'idVerification.submittedAt idVerification.reviewedAt ' +
        'idVerification.rejectionReason createdAt',
      )
      .sort({ 'idVerification.submittedAt': -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(query),
  ]);

  res.status(StatusCodes.OK).json({
    count: total,
    numOfPages: Math.ceil(total / limit),
    page,
    users,
  });
};

// ─── 3. PATCH /admin/id-verification/:userId/approve ─────────────────────────

export const approveIdVerification = async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;

  const user = await User.findById(userId).select('idVerification username');
  if (!user) throw new NotFoundError('User not found');

  if (!user.idVerification || user.idVerification.status !== 'pending') {
    throw new BadRequestError(
      `Cannot approve: verification status is "${user.idVerification?.status ?? 'none'}", expected "pending".`,
    );
  }

  user.idVerification.status     = 'approved';
  user.idVerification.reviewedAt = new Date();
  user.idVerification.rejectionReason = undefined;

  await user.save();

  res.status(StatusCodes.OK).json({
    msg: `ID verification for user "${user.username}" has been approved.`,
    userId: user._id,
    status: user.idVerification.status,
    reviewedAt: user.idVerification.reviewedAt,
  });
};

// ─── 4. PATCH /admin/id-verification/:userId/reject ──────────────────────────

export const rejectIdVerification = async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;

  const user = await User.findById(userId).select('idVerification username');
  if (!user) throw new NotFoundError('User not found');

  if (!user.idVerification || user.idVerification.status !== 'pending') {
    throw new BadRequestError(
      `Cannot reject: verification status is "${user.idVerification?.status ?? 'none'}", expected "pending".`,
    );
  }

  const { reason } = req.body;
  if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
    throw new BadRequestError(
      'A rejection reason of at least 5 characters is required.',
    );
  }

  user.idVerification.status          = 'rejected';
  user.idVerification.reviewedAt      = new Date();
  user.idVerification.rejectionReason = reason.trim();

  await user.save();

  res.status(StatusCodes.OK).json({
    msg: `ID verification for user "${user.username}" has been rejected.`,
    userId:          user._id,
    status:          user.idVerification.status,
    rejectionReason: user.idVerification.rejectionReason,
    reviewedAt:      user.idVerification.reviewedAt,
  });
};

// ─── 5. GET /user/verify-id/status ───────────────────────────────────────────
// User can check their own verification status without exposing raw document URLs.

export const getMyVerificationStatus = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;

  const user = await User.findById(userId).select(
    'idVerification.status idVerification.submittedAt ' +
    'idVerification.reviewedAt idVerification.rejectionReason',
  );
  if (!user) throw new NotFoundError('User not found');

  res.status(StatusCodes.OK).json({
    idVerification: user.idVerification ?? { status: 'none' },
  });
};
