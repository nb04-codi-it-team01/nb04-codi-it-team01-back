import passport from 'passport';
import { Request, Response, NextFunction } from 'express'; // 타입 추가
import { accessTokenStrategy, refreshTokenStrategy } from './jwtStrategy';
import { localStrategy } from './localStrategy.js';
import { User } from '@prisma/client';

// 1) 전략 등록
passport.use('local', localStrategy);
passport.use('access-token', accessTokenStrategy);
passport.use('refresh-token', refreshTokenStrategy);

// 2) 자주 쓰는 authenticate 미들웨어 래퍼들
export const localAuth = passport.authenticate('local', { session: false });
export const accessTokenAuth = passport.authenticate('access-token', { session: false });
export const refreshTokenAuth = passport.authenticate('refresh-token', { session: false });

//  3) 느슨한 가드 (Optional Auth)
// 토큰이 유효하면 req.user에 넣고, 없거나 틀리면 그냥 통과.
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate(
    'access-token',
    { session: false },
    (err: Error | null, user: User | false | null, _info: unknown) => {
      // 에러가 있거나, 유저가 없으면(false/null) -> 그냥 게스트(Guest)로 통과
      if (err || !user) {
        return next();
      }

      req.user = user;
      return next();
    },
  )(req, res, next);
};

// 4) passport 자체도 내보내기
export default passport;
