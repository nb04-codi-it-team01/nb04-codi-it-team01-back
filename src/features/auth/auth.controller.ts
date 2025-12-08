import { type Request, type Response, type NextFunction } from 'express';
import prisma from '../../lib/prisma.js';
import type { PrismaClient } from '@prisma/client';
import { loginDTO } from './auth.dto.js';
import { AuthService } from './auth.service.js';
import { AuthRepository } from './auth.repository.js';
import bcrypt from 'bcrypt';
import { setTokenCookies, clearTokenCookies } from '../../lib/auth.cookie-option.js';
import { generateToken } from '../../lib/generate-token.js';

export class AuthController {
  private prisma: typeof prisma;
  private authService;
  private repository;
  constructor(prisma: PrismaClient, authService: AuthService, repository: AuthRepository) {
    this.prisma = prisma;
    this.authService = authService;
    this.repository = repository;
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body as loginDTO;
      const user = await this.repository.findByEmail(email);
      const userId = req.user?.id;
      if (!userId)
        return res.status(401).json({ message: '인증이 필요합니다.', error: 'Unauthorized' });
      if (!user)
        return res.json({ status: 404, message: '해당유저를 찾지 못했습니다.', error: 'NotFound' });
      const isMatched = await bcrypt.compare(password, user.password);
      if (!isMatched)
        return res.json({ status: 400, message: '잘못된 요청입니다', error: 'Bad Request' }); //TODO: 에러 메시지 확인후 수정
      // 서비스 파일로 보내기
      const result = await this.authService.login(userId);
      return res.json({ status: 200, message: '로그인에 성공했습니다.', data: result });
    } catch (error) {
      next(error);
    }
  }
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

  async handleToknenRefresh(req: Request, res: Response, next: NextFunction) {
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
