import {
  type StrategyOptions,
  type VerifiedCallback,
  ExtractJwt,
  Strategy as JwtStrategy,
} from 'passport-jwt';
import { Request } from 'express'; // Request 타입 import
import {
  JWT_ACCESS_TOKEN_SECRET,
  JWT_REFRESH_TOKEN_SECRET,
  JWT_REFRESH_TOKEN_COOKIE_NAME,
} from '../constants';
import prisma from '../prisma';

interface JwtPayloadInterface {
  sub: string;
  email?: string;
  iat?: number;
  exp?: number;
}

// 1. Access Token 옵션
const accessTokenOptions: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: JWT_ACCESS_TOKEN_SECRET,
};

// 2. Refresh Token 옵션 (헤더와 쿠키 모두 지원 + passReqToCallback)
const refreshTokenOptions: StrategyOptions = {
  // 쿠키를 최우선으로 찾고, 없으면 헤더를 찾아보는 커스텀 추출기
  jwtFromRequest: (req) => {
    let token = null;

    // 1. 쿠키에서 먼저 찾기 (운영 환경 & HttpOnly)
    if (req && req.cookies) {
      token = req.cookies[JWT_REFRESH_TOKEN_COOKIE_NAME];
    }

    // 2. 쿠키에 없으면 헤더에서 찾기 (테스트 도구, 앱 등 쿠키 못 쓰는 환경 대비)
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    return token;
  },

  secretOrKey: JWT_REFRESH_TOKEN_SECRET,
  passReqToCallback: true, // DB 비교 로직을 위해 필수
};

// 3. Access Token 검증 로직
const accessTokenVerify = async (payload: JwtPayloadInterface, done: VerifiedCallback) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (user) {
      done(null, user);
    } else {
      done(null, false);
    }
  } catch (error) {
    done(error, false);
  }
};

// 4. Refresh Token 검증 로직
const refreshTokenVerify = async (
  req: Request,
  payload: JwtPayloadInterface,
  done: VerifiedCallback,
) => {
  try {
    const userId = payload.sub;
    if (!userId) return done(null, false);

    // 유저 조회
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return done(null, false);

    // DB 토큰과 요청 토큰 비교
    let tokenFromRequest = req.cookies?.[JWT_REFRESH_TOKEN_COOKIE_NAME];

    // 쿠키에 없으면 헤더에서 찾기
    if (!tokenFromRequest && req.headers.authorization) {
      tokenFromRequest = req.headers.authorization.split(' ')[1];
    }

    // DB의 토큰과 다르면 (로그아웃됨 or 위조됨) -> 차단
    if (user.refreshToken !== tokenFromRequest) {
      return done(null, false);
    }

    return done(null, user);
  } catch (error) {
    return done(error, false);
  }
};

// 5. 전략 생성 및 export
export const accessTokenStrategy = new JwtStrategy(accessTokenOptions, accessTokenVerify);
export const refreshTokenStrategy = new JwtStrategy(refreshTokenOptions, refreshTokenVerify);
