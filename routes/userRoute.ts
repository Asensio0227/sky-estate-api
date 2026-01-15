import express from 'express';
const router = express.Router();

import { createPushToken } from '../controller/expoController';
import { authorizedPermissions } from '../middleware/authenticatedUser';
import { upload } from '../middleware/multerMiddleware';
import { testingUser } from '../middleware/testingUser';
import {
  actionUser,
  getAllUsers,
  getSingleUser,
  showMeUser,
  updateLocation,
  updateManualLocation,
  updatePassword,
  updateUser,
} from './../controller/userController';
router.post('/expo-token', testingUser, createPushToken);

router.get('/', getAllUsers);
router.get('/showMe', showMeUser);
router.put('/update-user', testingUser, upload.single('avatar'), updateUser);
router.patch('/location', testingUser, updateLocation);
router.patch('/manual-location', testingUser, updateManualLocation);
router.put(
  '/:id',
  testingUser,
  testingUser,
  authorizedPermissions('admin', 'assistant', 'member'),
  actionUser
);
router.patch('/', testingUser, updatePassword);
router.get('/:id', getSingleUser);

export default router;
