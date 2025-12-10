import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { AuthController } from './auth.controller';
import { loginHandler } from './auth.validate';
import prisma from '../../lib/prisma';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import passport from '../../lib/passport/index';

const router = express.Router();
const repository = new AuthRepository(prisma);
const service = new AuthService(repository);
const authController = new AuthController(service, repository); //초기화

// 로그인 API
//[POST] /api/auth/login router

router.post(
  '/auth/login',
  loginHandler,
  passport.authenticate('local', { session: false }),
  async (req: Request, res: Response, next: NextFunction) => {
    console.log(1);
    await authController.login(req, res, next);
  },
);

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
    await authController.handleToknenRefresh(req, res, next),
);

export default router;
