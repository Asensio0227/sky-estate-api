import mongoose from 'mongoose';
import { UserDocument } from './userModel';

export interface INotifications extends mongoose.Document {
  expoPushToken: string;
  message: object;
  status: string;
  userId: UserDocument | any;
  createdBy: UserDocument | any;
  ticketId: any;
}

const notificationSchema = new mongoose.Schema(
  {
    expoPushToken: { type: String, require: true },
    message: { type: Object, require: true },
    status: {
      type: String,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      require: true,
      ref: 'User',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      require: true,
      ref: 'User',
    },
    ticketId: { type: Object, default: {} },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<INotifications>('Notifications', notificationSchema);
