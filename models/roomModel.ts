import mongoose from 'mongoose';

export interface RoomType extends mongoose.Document {
  participantsArray: string[];
  participants: mongoose.Types.ObjectId[];
  lastMessage: mongoose.Types.ObjectId | null;
  userId: mongoose.Types.ObjectId;
}

const roomSchema = new mongoose.Schema(
  {
    // FIX #5 — canonical identifier: always email strings for fast $in queries
    participantsArray: {
      type: [String],
      required: true,
    },
    // FIX #12 — normalized ObjectId refs instead of a schemaless Array blob
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // FIX #12 — ObjectId ref instead of embedded Object; populated on demand.
    // Only sendMsg may write this field (server-controlled).
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

// BONUS — indexes for common query patterns
roomSchema.index({ participantsArray: 1 });
roomSchema.index({ updatedAt: -1 });

export default mongoose.model<RoomType>('Room', roomSchema);
