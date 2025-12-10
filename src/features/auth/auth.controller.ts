import { type Request, type Response, type NextFunction } from 'express';
//import prisma from '../../lib/prisma.js';
//import type { PrismaClient } from '@prisma/client';
import { loginDTO } from './auth.dto';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import bcrypt from 'bcrypt';
import { setTokenCookies, clearTokenCookies } from '../../lib/auth.cookie-option';
import { generateToken } from '../../lib/generate-token';

export class AuthController {
  //private prisma: typeof prisma;
  private authService;
  private repository;
  constructor(authService: AuthService, repository: AuthRepository) {
    //this.prisma = prisma;
    this.authService = authService;
    this.repository = repository;
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      console.log(1);
      const { email, password } = req.body as loginDTO;
      const user = await this.repository.findByEmail(email);
      console.log('user:', user);
      const userId = req.user?.id;
      console.log(12);
      if (!user)
        return res.status(404).json({ message: '해당유저를 찾지 못했습니다.', error: 'NotFound' });
      console.log(123);
      console.log(userId);
      if (!userId)
        return res.status(401).json({ message: '인증이 필요합니다.', error: 'Unauthorized' });
      console.log(1234);
      const isMatched = await bcrypt.compare(password, user.password);
      if (!isMatched)
        return res.status(400).json({ message: '잘못된 요청입니다', error: 'Bad Request' }); //TODO: 에러 메시지 확인후 수정
      // 서비스 파일로 보내기
      console.log(12345);
      const result = await this.authService.login(userId);
      return res.status(200).json({ message: '로그인에 성공했습니다.', data: result });
    } catch (error) {
      console.log(error);
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
