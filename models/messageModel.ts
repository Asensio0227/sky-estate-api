import mongoose from 'mongoose';
import { IPhoto } from './estateModel';

export interface User {
  id?: string | number;
  _id?: string | number;
  username?: string;
  email?: string;
  avatar?: string;
  expoToken?: string;
}

export interface IMessage extends mongoose.Document {
  _id: string | number;
  text?: string;
  user: User | string;
  photo: IPhoto[];
  video?: IPhoto[];
  audio?: IPhoto[];
  system?: boolean;
  sent?: boolean;
  received?: boolean;
  pending?: boolean;
  quickReplies?: any;
  roomId: string;
}
const messageSchema = new mongoose.Schema(
  {
    text: {
      type: String,
    },
    photo: {
      type: [
        {
          id: {
            type: String,
          },
          url: {
            type: String,
          },
        },
      ],
    },
    audio: {
      type: [
        {
          id: {
            type: String,
          },
          url: {
            type: String,
          },
        },
      ],
    },
    video: {
      type: [
        {
          id: {
            type: String,
          },
          url: {
            type: String,
          },
        },
      ],
    },
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
    sent: { type: Boolean, default: false },
    pending: { type: Boolean, default: false },
    received: { type: Boolean, default: false },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Message', messageSchema);
