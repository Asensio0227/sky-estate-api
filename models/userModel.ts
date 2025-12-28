import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import validator from 'validator';

export enum statusOption {
  online = 'online',
  offline = 'offline', // Changed from Offline to offline
}

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

export interface UIUser extends Document {
  first_name: modalTypes;
  last_name: modalTypes;
  email: modalTypes | string;
  username: modalTypes | string;
  gender: modalTypes;
  ideaNumber: modalTypes;
  role: modalTypes;
  status: statusOption.offline;
  date_of_birth: modalTypes;
  physical_address: addressOb | any;
  contact_details: ContactOb | any;
  userAds_address: any;
}

export interface UserDocument extends UIUser, mongoose.Document {
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
  updatedAT: Date;
  lastSeen: Date;
  embedding_text: String;
  embedding: any;
  currentLocation?: Location;
  ComparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new mongoose.Schema<UserDocument>(
  {
    first_name: {
      type: String,
      required: [true, 'Please provide your name'],
      minlength: 5,
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
    avatar: {
      type: String,
    },
    email: {
      type: String,
      unique: true,
      required: [true, 'Please provide your email address'],
      validate: {
        validator: validator.isEmail,
        message: 'Please provide your email address',
      },
      trim: true,
    },
    username: {
      type: String,
      unique: true,
      required: [true, 'Please provide your username'],
      trim: true,
    },
    expoToken: {
      type: String,
    },
    date_of_birth: {
      type: String,
      required: [true, 'Please provide your date of birth'],
    },
    physical_address: {
      street: {
        type: String,
        required: [true, 'Please provide your street'],
      },
      city: {
        type: String,
        required: [true, 'Please provide your city'],
      },
      province: {
        type: String,
        required: [true, 'Please provide your state'],
      },
      postal_code: {
        type: String,
        required: [true, 'Please provide your zip code'],
      },
      country: {
        type: String,
        required: [true, 'Please provide your country'],
      },
    },
    hasOpenedApp: {
      type: Boolean,
      default: false,
    },
    contact_details: {
      phone_number: {
        type: String,
        required: [true, 'Please provide your phone number'],
        unique: true,
      },
      email: {
        type: String,
        required: [true, 'Please provide your email address'],
        match: [/.+@.+\..+/, 'Please enter a valid email address'],
        unique: true,
      },
    },
    status: {
      type: String,
      enum: [statusOption.online, statusOption.offline], // Use enum values directly
      default: statusOption.offline,
    },
    banned: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      required: [true, 'Please provide your password'],
      minlength: 6,
    },
    userAds_address: {
      type: { type: String, enum: ['Point'], required: true },
      coordinates: { type: Array, index: '2dsphere', required: true },
    },
    role: {
      type: String,
      enum: ['admin', 'user', 'member', 'assistant'],
      default: 'user',
    },
    verified: {
      type: Date,
    },
    passwordTokenExpirationDate: {
      type: Date,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    passwordToken: {
      type: Number,
    },
    verificationToken: {
      type: Number,
    },
    embedding_text: String,
    embedding: { type: [Number], index: '2dsphere' },
    lastSeen: { type: Date },
    currentLocation: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number], index: '2dsphere' },
    },
  },
  { timestamps: true }
);
// AI
// userSchema.index(
//   { embedding: '2dsphere', address: '2dsphere' },
//   { name: 'vector_index' }
// );
userSchema.index({ userAds_address: '2dsphere' });
userSchema.index({ currentLocation: '2dsphere' });

userSchema.pre('save', async function (this: UserDocument) {
  if (!this.isModified('password')) return;
  const genSalt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, genSalt);
});

userSchema.methods.ComparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<UserDocument>('User', userSchema);
