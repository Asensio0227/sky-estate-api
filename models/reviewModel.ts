import mongoose from 'mongoose';
import Estate from './estateModel';

export interface Review extends mongoose.Document {
  rating: number;
  title: string;
  comment: string;
  user: mongoose.Types.ObjectId | unknown;
  estate: mongoose.Types.ObjectId | unknown;
}

export interface ReviewModel
  extends mongoose.Model<
    Review,
    // mongoose.Query,
    // mongoose.Helper,
    // mongoose.Virtuals,
    // mongoose.HydratedDocument,
    mongoose.Schema
  > {
  calculateAverageRating(
    estateId: string
  ): Promise<{ average_rating: number; numOfReviews: number }>;
}

const reviewSchema = new mongoose.Schema(
  {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: [true, 'Please provide rating'],
    },
    title: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    comment: {
      type: String,
      required: [true, 'Please provide comment'],
      trim: true,
      maxlength: 10000,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide user'],
    },
    estate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'House',
      required: [true, 'Please provide house'],
    },
  },
  { timestamps: true }
);

reviewSchema.index({ estate: 1, user: 1 }, { unique: true });

reviewSchema.statics.calculateAverageRating = async function (estateId: any) {
  const result = await this.aggregate([
    { $match: { estate: estateId } },
    {
      $group: {
        _id: null,
        average_rating: { $avg: '$rating' },
        numOfReviews: { $sum: 1 },
      },
    },
  ]);

  try {
    await Estate.findOneAndUpdate(
      { _id: estateId },
      {
        average_rating: Math.ceil(result[0]?.average_rating || 0),
        numOfReviews: result[0]?.numOfReviews,
      }
    );
  } catch (error: any) {
    console.log(error);
  }
};

reviewSchema.post('save', async function (this: Review) {
  const model = this.constructor as any;
  await model.calculateAverageRating(this.estate as string);
});

reviewSchema.post('deleteOne', async function (this: Review) {
  const model = mongoose.model('Review') as unknown as ReviewModel;
  await model.calculateAverageRating(this.estate as string);
});

export default mongoose.model('Review', reviewSchema);
