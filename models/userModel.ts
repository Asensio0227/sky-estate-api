import bcrypt from 'bcrypt';
import crypto from 'crypto';
import mongoose from 'mongoose';
import validator from 'validator';

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum statusOption {
  online = 'online',
  offline = 'offline',
}

// ─── Shared sub-interfaces ────────────────────────────────────────────────────

export interface Location {
  type: 'Point';
  coordinates: number[];
}

export interface modalTypes {
  type: String;
  required?: [true, string];
  minlength?: number;
  maxlength?: number;
  trim?: true;
  unique?: true;
  validate?: {
    validator: (str: string, options?: any) => boolean;
    message: string;
  };
}

export interface addressOb {
  street: modalTypes;
  city: modalTypes;
  province: modalTypes;
  postal_code: modalTypes;
  country: modalTypes;
}

export interface ContactOb {
  phone_number: modalTypes;
  email: modalTypes;
  address?: modalTypes;
}

// ─── Domain types ─────────────────────────────────────────────────────────────

export type RealtorStatus = 'none' | 'pending' | 'approved' | 'rejected';
export type IdVerificationStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface RealtorApplication {
  agencyName?: string;
  licenseNumber: string;
  documents: string[];
  experience?: string;
  submittedAt: Date;
}

export interface IdVerification {
  /** Raw ID number — stripped before save; only held transiently in memory */
  idNumber?: string;
  /** SHA-256 hash of idNumber — stored permanently for duplicate detection */
  idNumberHash?: string;
  /** Cloudinary URL for the government-issued ID document */
  document?: string;
  /** Cloudinary URL for the live selfie */
  selfie?: string;
  status: IdVerificationStatus;
  rejectionReason?: string;
  submittedAt?: Date;
  reviewedAt?: Date;
}

// ─── Document interface ───────────────────────────────────────────────────────

export interface UIUser extends Document {
  first_name: modalTypes;
  last_name: modalTypes;
  email: modalTypes | string;
  username: modalTypes | string;
  gender: modalTypes;
  ideaNumber: modalTypes;
  role: string;
  status: statusOption.offline;
  date_of_birth: modalTypes;
  physical_address: addressOb | any;
  contact_details: ContactOb | any;
  userAds_address: any;
}

export interface UserDocument extends UIUser, mongoose.Document {
  _id: mongoose.Types.ObjectId;
  password: string;
  verificationToken: number | string;
  avatar: string;
  expoToken: string;
  banned: boolean;
  isVerified: boolean;
  hasOpenedApp: boolean;
  passwordToken: number | null;
  passwordTokenExpirationDate: Date | null;
  verified: Date | number;
  createdAt: Date;
  updatedAt: Date;
  lastSeen: Date;
  embedding_text: String;
  embedding: any;
  currentLocation?: Location;
  realtorStatus: RealtorStatus;
  realtorApplication?: RealtorApplication;
  idVerification?: IdVerification;
  ComparePassword(candidatePassword: string): Promise<boolean>;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const userSchema = new mongoose.Schema<UserDocument>(
  {
    first_name: {
      type: String,
      required: [true, 'Please provide your name'],
      minlength: 3,
      maxlength: 20,
      trim: true,
    },
    last_name: {
      type: String,
      required: [true, 'Please provide your surname'],
      minlength: 3,
      maxlength: 20,
      trim: true,
    },
    gender: {
      type: String,
      required: [true, 'Please provide your gender'],
      minlength: 2,
      maxlength: 50,
      trim: true,
    },
    ideaNumber: {
      type: String,
      required: [true, 'Please provide your Idea Number'],
      minlength: 5,
      maxlength: 20,
      trim: true,
      unique: true,
    },
    avatar:   { type: String },
    email: {
      type: String,
      unique: true,
      required: [true, 'Please provide your email address'],
      validate: { validator: validator.isEmail, message: 'Please provide a valid email address' },
      trim: true,
    },
    username: {
      type: String,
      unique: true,
      required: [true, 'Please provide your username'],
      trim: true,
    },
    expoToken:      { type: String },
    date_of_birth:  { type: String, trim: true, required: [true, 'Please provide your date of birth'] },
    physical_address: {
      street:      { type: String, trim: true, required: [true, 'Please provide your street'] },
      city:        { type: String, trim: true, required: [true, 'Please provide your city'] },
      province:    { type: String, trim: true, required: [true, 'Please provide your state'] },
      postal_code: { type: String, trim: true, required: [true, 'Please provide your zip code'] },
      country:     { type: String, trim: true, required: [true, 'Please provide your country'] },
    },
    hasOpenedApp: { type: Boolean, default: false },
    contact_details: {
      phone_number: { type: String, required: [true, 'Please provide your phone number'], unique: true, trim: true },
      email:        { type: String, required: [true, 'Please provide your email address'], match: [/.+@.+\..+/, 'Please enter a valid email address'], unique: true, trim: true },
    },
    status:   { type: String, enum: [statusOption.online, statusOption.offline], default: statusOption.offline },
    banned:   { type: Boolean, default: false },
    password: { type: String, required: [true, 'Please provide your password'], minlength: 6 },
    userAds_address: {
      type:        { type: String, enum: ['Point'], required: true },
      coordinates: { type: Array, required: true },
    },
    role: {
      type: String,
      enum: ['super-admin', 'admin', 'realtor', 'user', 'member', 'assistant'],
      default: 'user',
    },
    verified:                    { type: Date },
    passwordTokenExpirationDate: { type: Date },
    isVerified:        { type: Boolean, default: false },
    passwordToken:     { type: Number },
    verificationToken: { type: Number },

    realtorStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none',
    },
    realtorApplication: {
      agencyName:    { type: String, trim: true },
      licenseNumber: { type: String, trim: true },
      documents:     [{ type: String }],
      experience:    { type: String, trim: true },
      submittedAt:   { type: Date },
    },

    // ── ID Verification ──────────────────────────────────────────────────────
    idVerification: {
      // Raw ID is wiped in pre-save after hashing — never persisted to DB.
      // select: false prevents it leaking in query results.
      idNumber:     { type: String, trim: true, select: false },
      idNumberHash: { type: String, trim: true },
      document:     { type: String },   // Cloudinary URL (government-issued ID)
      selfie:       { type: String },   // Cloudinary URL (live photo)
      status: {
        type: String,
        enum: ['none', 'pending', 'approved', 'rejected'],
        default: 'none',
      },
      rejectionReason: { type: String, trim: true },
      submittedAt:     { type: Date },
      reviewedAt:      { type: Date },
    },

    // ── AI embedding vector (plain number array — NOT a geo field) ───────────
    embedding_text: { type: String },
    embedding:      { type: [Number] }, // No 2dsphere index — this is not geo data

    lastSeen: { type: Date },
    currentLocation: {
      type:        { type: String, enum: ['Point'] },
      coordinates: { type: [Number] },
    },
  },
  { timestamps: true },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

userSchema.index({ userAds_address: '2dsphere' });
userSchema.index({ currentLocation: '2dsphere' });
userSchema.index({ isVerified: 1, role: 1 });
userSchema.index({ realtorStatus: 1 });
userSchema.index({ 'idVerification.status': 1 });                      // admin queue
userSchema.index({ 'idVerification.idNumberHash': 1 }, { sparse: true }); // dup detection

// ─── Pre-save: hash ID number, strip raw value ────────────────────────────────

userSchema.pre('save', function (this: UserDocument, next) {
  if (this.idVerification?.idNumber) {
    this.idVerification.idNumberHash = crypto
      .createHash('sha256')
      .update(this.idVerification.idNumber)
      .digest('hex');

    // Raw ID number is NEVER stored in the database
    this.idVerification.idNumber = undefined;
  }
  next();
});

// ─── Pre-save: hash password ──────────────────────────────────────────────────

userSchema.pre('save', async function (this: UserDocument, next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Instance methods ─────────────────────────────────────────────────────────

userSchema.methods.ComparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<UserDocument>('User', userSchema);
