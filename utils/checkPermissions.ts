import { UnauthorizedError } from '../errors/custom';
import { UserDocument } from '../models/userModal';

export const checkPermissions = (
  requestUser: UserDocument | any,
  resourceUserId: string
) => {
  if (
    requestUser.role === 'admin' ||
    requestUser.role === 'member' ||
    requestUser.role === 'assistant'
  )
    return;
  if (requestUser.userId.toString() === resourceUserId.toString()) return;
  throw new UnauthorizedError('Not authorized to access this route');
};
