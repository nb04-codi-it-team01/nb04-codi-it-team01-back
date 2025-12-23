import passport from 'passport';
import { accessTokenStrategy, refreshTokenStrategy } from './jwtStrategy';
import { localStrategy } from './localStrategy.js';
import { User } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';

// 1) 전략 등록
passport.use('local', localStrategy);
passport.use('access-token', accessTokenStrategy);
passport.use('refresh-token', refreshTokenStrategy);

// 2) 자주 쓰는 authenticate 미들웨어 래퍼들
export const localAuth = passport.authenticate('local', { session: false });
export const accessTokenAuth = passport.authenticate('access-token', { session: false });
export const refreshTokenAuth = passport.authenticate('refresh-token', { session: false });
export const logoutAuth = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate(
    'refresh-token',
    { session: false },
    (err: Error | null, user: User | false | null, _info: unknown) => {
      if (err || !user) {
        return res.status(200).json({
          status: 200,
          message: '성공적으로 로그아웃되었습니다.',
        });
      }
      req.user = user;
      next();
    },
  )(req, res, next);
};

// 3) passport 자체도 내보내기(필요 없으면 삭제)
export default passport;
