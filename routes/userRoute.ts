import express from 'express';
const router = express.Router();

import { createPushToken } from '../controller/expoController';
import { authorizedPermissions } from '../middleware/authenticatedUser';
import { upload } from '../middleware/multerMiddleware';
import {
  actionUser,
  getAllUsers,
  getSingleUser,
  showMeUser,
  updatePassword,
  updateUser,
} from './../controller/userController';
router.post('/expo-token', createPushToken);

router.get('/', getAllUsers);
router.get('/showMe', showMeUser);
router.put('/update-user', upload.single('avatar'), updateUser);
router.put(
  '/:id',
  authorizedPermissions('admin', 'assistant', 'member'),
  actionUser
);
router.patch('/', updatePassword);
router.get('/:id', getSingleUser);

export default router;
