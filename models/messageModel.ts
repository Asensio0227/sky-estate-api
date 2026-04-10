import mongoose from 'mongoose';
import { IPhoto } from './estateModel';

export interface IMessage extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  text?: string;
  user: mongoose.Types.ObjectId;
  photo: IPhoto[];
  video?: IPhoto[];
  audio?: IPhoto[];
  file?: IPhoto[];
  system?: boolean;
  sent?: boolean;
  received?: boolean;
  pending?: boolean;
  isRead?: boolean;
  readAt?: Date;
  quickReplies?: any;
  roomId: mongoose.Types.ObjectId;
}

const mediaItemSchema = {
  id:   { type: String },
  url:  { type: String },
  name: { type: String },
};

const messageSchema = new mongoose.Schema<IMessage>(
  {
    text: { type: String },
    photo:  { type: [mediaItemSchema], default: [] },
    audio:  { type: [mediaItemSchema], default: [] },
    video:  { type: [mediaItemSchema], default: [] },
    file:   { type: [mediaItemSchema], default: [] },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    sent:    { type: Boolean, default: false },
    pending: { type: Boolean, default: false },
    received:{ type: Boolean, default: false },
    isRead:  { type: Boolean, default: false },
    // BONUS — readAt timestamp for precise delivery tracking
    readAt:  { type: Date, default: null },
  },
  { timestamps: true },
);

// BONUS — compound index: most common query pattern for fetching chat history
messageSchema.index({ roomId: 1, createdAt: -1 });

export default mongoose.model<IMessage>('Message', messageSchema);
