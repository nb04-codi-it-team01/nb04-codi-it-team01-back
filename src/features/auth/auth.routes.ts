import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { AuthController } from './auth.controller.js';
import { loginHandler } from './auth.validate.js';
import prisma from '../../lib/prisma.js';
import { AuthService } from './auth.service.js';
import { AuthRepository } from './auth.repository.js';

const router = express.Router();
const repository = new AuthRepository(prisma);
const authController = new AuthController(prisma, AuthService, repository); //초기화

// 로그인 API
//[POST] /api/auth/login router

router.post('/auth/login', loginHandler, async (req: Request, res: Response, next: NextFunction) =>
  authController.login(req, res, next),
);

// 로그아웃 API
// [POST] /api/auth/logout

router.post('/auth/logout', async (req: Request, res: Response, next: NextFunction) =>
  authController.logout(req, res, next),
);
// 리프레시 API
// [POST] /api/auth/refresh

router.post('/auth/refresh', async (req: Request, res: Response, next: NextFunction) =>
  authController.handleToknenRefresh(req, res, next),
);

export default router;
