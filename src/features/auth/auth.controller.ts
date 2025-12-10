import { type Request, type Response, type NextFunction } from 'express';
//import prisma from '../../lib/prisma.js';
//import type { PrismaClient } from '@prisma/client';
import { loginDTO } from './auth.dto';
import { AuthService } from './auth.service';
import { setTokenCookies, clearTokenCookies } from '../../lib/auth.cookie-option';
import { generateToken } from '../../lib/generate-token';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as loginDTO;

      const { user, accessToken, refreshToken } = await this.authService.login(email, password);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });

      return res.status(201).json({
        user,
        accessToken,
      });
    } catch (error) {
      next(error);
    }
  };

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      // 만약 유저가 아니라면
      const user = req.user;
      if (!user)
        return res.json({ status: 401, message: '인증이 필요합니다.', error: 'Unauthorized' });
      const userId = user.id;
      if (!userId)
        return res.status(400).json({ message: '잘못된 요청입니다', error: 'BadRequest' });
      // set cookie 헤더로 쿠키 다지워주기
      clearTokenCookies(res);
      return res.json({
        status: 200,
        message: '성공으로 로그아웃되었습니다.',
      });
    } catch (error) {
      next(error);
    }
  }

  async handleTokenRefresh(req: Request, res: Response, next: NextFunction) {
    try {
      // 유저유효성 검사
      const userId = req.user?.id;
      if (!userId)
        return res.status(401).json({ message: '인증이 필요합니다', error: 'Unauthorized' });
      const tokens = generateToken(userId);
      setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
    } catch (error) {
      next(error);
    }
  }
}
