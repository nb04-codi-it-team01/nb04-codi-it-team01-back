import { Router } from 'express';
import { validateBody } from '../../shared/middleware/validate';
import { createUserSchema, updateUserSchema } from './user.schema';
import { upload, mapImageToBody } from '../../shared/middleware/upload-handler';
import { accessTokenAuth } from '../../shared/middleware/auth';
import { createUserController } from './user.composition';

const router = Router();
const controller = createUserController();

/**
 * POST /api/users - 회원가입
 */
router.post('/users', validateBody(createUserSchema), controller.createUser);

/**
 * GET /api/users/me - 내 정보 조회
 */
router.get('/users/me', accessTokenAuth, controller.getMyInfo);

/**
 * PATCH /api/users/me - 내 정보 수정
 */
router.patch(
  '/users/me',
  accessTokenAuth,
  upload.single('image'),
  mapImageToBody('image'),
  validateBody(updateUserSchema),
  controller.updateMyInfo,
);

/**
 * GET /api/users/me/likes - 관심 스토어 조회
 */
router.get('/users/me/likes', accessTokenAuth, controller.getMyLikes);

/**
 * DELETE /api/users/delete - 회원 탈퇴
 */
router.delete('/users/delete', accessTokenAuth, controller.deleteUser);

export default router;
