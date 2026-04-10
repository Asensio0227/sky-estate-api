import mongoose from 'mongoose';

export interface TokenUser extends mongoose.Document {
  refreshToken: string;
  ip: string;
  userAgent: string;
  isValid: boolean;
  user: mongoose.Types.ObjectId | unknown;
  createdAt: Date;
  updatedAt: Date;
  isExpired: () => boolean;
}

const TokenSchema = new mongoose.Schema<TokenUser>(
  {
    refreshToken: { type: String, required: true },
    ip: { type: String, required: true },
    userAgent: { type: String, required: true },
    isValid: { type: Boolean, default: true },
    user: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// TTL index: auto-delete tokens after 7 days to prevent accumulation
TokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

export default mongoose.model<TokenUser>('Token', TokenSchema);
