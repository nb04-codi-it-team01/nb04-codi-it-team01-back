import passport from 'passport';
import { accessTokenStrategy, refreshTokenStrategy } from './jwtStrategy';
import { localStrategy } from './localStrategy.js';

// 1) 전략 등록
passport.use('local', localStrategy);
passport.use('access-token', accessTokenStrategy);
passport.use('refresh-token', refreshTokenStrategy);

// 2) 자주 쓰는 authenticate 미들웨어 래퍼들
export const localAuth = passport.authenticate('local', { session: false });
export const accessTokenAuth = passport.authenticate('access-token', { session: false });
export const refreshTokenAuth = passport.authenticate('refresh-token', { session: false });

// 3) passport 자체도 내보내기(필요 없으면 삭제)
export default passport;
