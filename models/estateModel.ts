import mongoose from 'mongoose';
import Review from './reviewModel';
import { ContactOb, modalTypes } from './userModel';

export interface IPhoto {
  id?: string;
  url?: string;
}

export interface UIEstateDocument extends mongoose.Document {
  photo: IPhoto[];
  title: string;
  description: string;
  price: number;
  location: any;
  contact_details: ContactOb;
  user: mongoose.Types.ObjectId | unknown;
  likedBy: mongoose.Types.ObjectId | unknown;
  viewedBy: mongoose.Types.ObjectId | unknown;
  average_rating: Number;
  numOfReviews: number;
  category: modalTypes;
  taken: Boolean;
  listingType: 'sale' | 'rent';
  rentPrice?: number;
  rentFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  depositAmount?: number;
  availableFrom?: Date;
  isFurnished?: boolean;
  minimumStay?: number;
  listingSource: 'municipality' | 'agent' | 'owner';
  isClaimable: boolean;
  claimedBy?: mongoose.Types.ObjectId;
  featuredUntil?: Date;
  viewsCount: number;
  likeCount: number;
  isVerified: boolean;
  bedrooms: Number;
  bathrooms: Number;
}

export interface estateDocument extends UIEstateDocument, mongoose.Document {
  featured: boolean;
  createdAt: Date;
  updatedAT: Date;
}

const estateSchema = new mongoose.Schema<estateDocument>(
  {
    photo: {
      type: [
        {
          id: {
            type: String,
            required: true,
          },
          url: {
            type: String,
            required: true,
          },
        },
      ],
      required: [true, 'Please upload at least 1 image'],
    },
    title: {
      type: String,
      required: [true, 'Please provide title'],
      minlength: 5,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: [true, 'Please provide description'],
      minlength: 10,
      trim: true,
      maxlength: 1000,
    },
    price: {
      type: Number,
      required: function (this: estateDocument) {
        return this.listingType === 'sale';
      },
      min: 1,
    },
    featured: {
      type: Boolean,
      default: true,
    },
    taken: { type: Boolean, default: false },
    listingType: {
      type: String,
      required: [true, 'Please specify listing type'],
      enum: ['sale', 'rent'],
      trim: true,
      default: 'sale',
    },
    rentPrice: {
      type: Number,
      required: function (this: estateDocument) {
        return this.listingType === 'rent';
      },
      min: 1,
    },
    rentFrequency: {
      type: String,
      required: function (this: estateDocument) {
        return this.listingType === 'rent';
      },
      trim: true,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
    },
    depositAmount: {
      type: Number,
      min: 0,
    },
    availableFrom: {
      type: Date,
    },
    isFurnished: {
      type: Boolean,
    },
    minimumStay: {
      type: Number,
      min: 1,
    },
    location: {
      type: { type: String, enum: ['Point'], required: true },
      coordinates: { type: Array, index: '2dsphere', required: true },
    },
    contact_details: {
      phone_number: {
        type: String,
        trim: true,
        required: [true, 'Please provide your phone number'],
      },
      email: {
        type: String,
        trim: true,
        required: [true, 'Please provide your email address'],
        match: [/.+@.+\..+/, 'Please enter a valid email address'],
      },
      address: {
        type: String,
        trim: true,
        required: [true, 'Please provide your address'],
      },
    },
    average_rating: {
      type: Number,
      default: 0,
    },
    numOfReviews: {
      type: Number,
      default: 0,
    },
    category: {
      type: String,
      required: [true, 'Please provide category'],
      enum: {
        values: ['Apartments', 'Houses', 'Condos', 'Villas', 'Land'],
        message: '{Value} is not supported.',
      },
    },
    listingSource: {
      type: String,
      enum: ['municipality', 'agent', 'owner'],
      trim: true,
      default: 'owner',
    },
    isClaimable: {
      type: Boolean,
      default: false,
    },
    claimedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    featuredUntil: {
      type: Date,
    },
    viewsCount: {
      type: Number,
      default: 0,
    },
    viewedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    likeCount: {
      type: Number,
      default: 0,
    },
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isVerified: {
      type: Boolean,
      default: false,
    },
    bedrooms: { type: Number, min: 0 },
    bathrooms: { type: Number, min: 0 },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

estateSchema.index({ location: '2dsphere' });
estateSchema.index({ user: 1, title: 1, 'photo.0.url': 1 }, { unique: true });
estateSchema.index({ likedBy: 1 });
estateSchema.index({ viewedBy: 1 });
estateSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'estate',
  justOne: false,
});

estateSchema.pre('save', async function (next) {
  try {
    const Estate = this.constructor as mongoose.Model<estateDocument> | any;

    const existingDoc = await Estate.findOne({
      user: this.user,
      title: this.title,
      photo: this.photo,
      _id: { $ne: this._id }, // IMPORTANT: avoids blocking updates
    });

    if (existingDoc) {
      return next(
        new Error('Document with same title, photo, and user already exists')
      );
    }

    next();
  } catch (err) {
    next(err as any);
  }
});

estateSchema.pre('deleteOne', async function (next) {
  try {
    const estateId = this.getFilter()['_id'];
    await Review.deleteMany({ estate: estateId });
    next();
  } catch (error: any) {
    next(error);
  }
});

export default mongoose.model('House', estateSchema);
