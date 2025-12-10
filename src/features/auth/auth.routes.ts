import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { AuthController } from './auth.controller';
import { loginHandler } from './auth.validate';
import { AuthService } from './auth.service';
import passport from '../../lib/passport/index';

const router = express.Router();
const service = new AuthService();
const authController = new AuthController(service);

// 로그인 API
//[POST] /api/auth/login router

router.post('/auth/login', loginHandler, authController.login);

// 로그아웃 API
// [POST] /api/auth/logout

router.post(
  '/auth/logout',
  async (req: Request, res: Response, next: NextFunction) =>
    await authController.logout(req, res, next),
);
// 리프레시 API
// [POST] /api/auth/refresh

router.post(
  '/auth/refresh',
  passport.authenticate('refresh-token', { session: false }),
  async (req: Request, res: Response, next: NextFunction) =>
    await authController.handleTokenRefresh(req, res, next),
);

export default router;
