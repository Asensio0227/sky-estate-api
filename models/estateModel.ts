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
  average_rating: Number;
  numOfReviews: number;
  category: modalTypes;
  taken: Boolean;
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
      maxlength: 100,
    },
    description: {
      type: String,
      required: [true, 'Please provide description'],
      minlength: 10,
      maxlength: 1000,
    },
    price: {
      type: Number,
      required: [true, 'Please provide price'],
      min: 1,
    },
    featured: {
      type: Boolean,
      default: true,
    },
    taken: { type: Boolean, default: false },
    location: {
      type: { type: String, enum: ['Point'], required: true },
      coordinates: { type: Array, index: '2dsphere', required: true },
    },
    contact_details: {
      phone_number: {
        type: String,
        required: [true, 'Please provide your phone number'],
      },
      email: {
        type: String,
        required: [true, 'Please provide your email address'],
        match: [/.+@.+\..+/, 'Please enter a valid email address'],
      },
      address: {
        type: String,
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

estateSchema.index(
  { location: '2dsphere' }
  // { location: '2dsphere', user: 1, title: 1, 'photo.0': 1 },
  // { unique: true }
);

estateSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'estate',
  justOne: false,
});

// estateSchema.pre('save', function (next) {
//   const self = this;
//   console.log(`====self====`);
//   console.log(self);
//   console.log(`====self====`);
//   estateModel.findOne(
//     {
//       user: self.user,
//       title: self.title,
//       photo: self.photo,
//     },
//     function (err: any, existingDoc: any) {
//       if (err) {
//         next(err);
//       } else if (existingDoc) {
//         next(
//           new Error('Document with same title, photo, and user already exists')
//         );
//       } else {
//         next();
//       }
//     }
//   );
// });

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
