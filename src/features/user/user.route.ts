import { Router } from 'express';
import { UserController } from './user.controller';
import { validateBody } from '../../shared/middleware/validate';
import { createUserSchema, updateUserSchema } from './user.schema';

const router = Router();
const controller = new UserController();

/**
 * POST /api/users - 회원가입
 */
router.post('/', validateBody(createUserSchema), controller.createUser);

/**
 * GET /api/users/me - 내 정보 조회
 * 인증 필요
 */
router.get('/me', controller.getMyInfo);

/**
 * PATCH /api/users/me - 내 정보 수정
 * multipart/form-data 지원 필요 (이미지 업로드)
 * 인증 필요
 */
router.patch('/me', validateBody(updateUserSchema), controller.updateMyInfo);

/**
 * GET /api/users/me/likes - 관심 스토어 조회
 * 인증 필요
 */
router.get('/me/likes', controller.getMyLikes);

/**
 * DELETE /api/users/delete - 회원 탈퇴
 * 인증 필요
 */
router.delete('/delete', controller.deleteUser);

export default router;
