import express from 'express';
import { AuthController } from './auth.controller';
import { loginSchema } from './auth.schema';
import { AuthService } from './auth.service';
import { refreshTokenAuth } from '../../lib/passport/index';
import { validateBody } from '../../shared/middleware/validate';

const router = express.Router();
const service = new AuthService();
const authController = new AuthController(service);

// 로그인 API
//[POST] /api/auth/login router
router.post('/auth/login', validateBody(loginSchema), authController.login);

// 로그아웃 API
// [POST] /api/auth/logout
router.post('/auth/logout', refreshTokenAuth, authController.logout);

// 리프레시 API
// [POST] /api/auth/refresh
router.post('/auth/refresh', refreshTokenAuth, authController.handleTokenRefresh);

export default router;
