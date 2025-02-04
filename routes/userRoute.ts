import express from 'express';
const router = express.Router();

import {
  actionUser,
  getAllUsers,
  getSingleUser,
  showMeUser,
  updateUser,
} from './../controller/userController';

router.get('/', getAllUsers);
router.get('/showMe', showMeUser);
router.put('/update-user', updateUser);
router.put('/:id', actionUser);
router.get('/:id', getSingleUser);

export default router;
