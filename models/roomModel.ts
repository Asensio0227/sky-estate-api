import mongoose from 'mongoose';
import { IMessage } from './messageModel';
import { UserDocument } from './userModel';

export interface RoomType extends mongoose.Document {
  participantsArray: string[];
  participants: UserDocument[];
  lastMessage: IMessage;
}

const roomSchema = new mongoose.Schema(
  {
    participantsArray: {
      type: [String],
      required: true,
    },
    participants: {
      type: Array,
      required: true,
    },
    lastMessage: {
      type: Object,
      default: {},
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Room', roomSchema);
