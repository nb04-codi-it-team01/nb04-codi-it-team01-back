import { type StrategyOptions, type VerifiedCallback, Strategy as JwtStrategy } from 'passport-jwt';
//import { ExtractJwt } from 'passport-jwt';
import {
  JWT_ACCESS_TOKEN_SECRET,
  JWT_REFRESH_TOKEN_SECRET,
  JWT_ACCESS_TOKEN_COOKIE_NAME,
  JWT_REFRESH_TOKEN_COOKIE_NAME,
} from '../constants';
import prisma from '../prisma';

interface JwtPayloadInterface {
  sub: string;
  email?: string;
  iat?: number;
  exp?: number;
}

const accessTokenOptions: StrategyOptions = {
  jwtFromRequest: (req) => req.cookies[JWT_ACCESS_TOKEN_COOKIE_NAME],
  secretOrKey: JWT_ACCESS_TOKEN_SECRET,
};

const refreshTokenOptions: StrategyOptions = {
  jwtFromRequest: (req) => {
    const token = req.cookies[JWT_REFRESH_TOKEN_COOKIE_NAME];

    return token;
  },
  secretOrKey: JWT_REFRESH_TOKEN_SECRET,
};

const jwtVerify = async (payload: JwtPayloadInterface, done: VerifiedCallback) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });

    done(null, user);
  } catch (error) {
    done(error, false);
  }
};

export const accessTokenStrategy = new JwtStrategy(accessTokenOptions, jwtVerify);
export const refreshTokenStrategy = new JwtStrategy(refreshTokenOptions, jwtVerify);
