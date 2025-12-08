import passport from 'passport';
import { accessTokenStrategy, refreshTokenStrategy } from './jwtStrategy.js';
import { localStrategy } from './localStrategy.js';
import prisma from '../prisma.js';
import { User } from '@prisma/client';

passport.use('local', localStrategy);
passport.use('access-token', accessTokenStrategy);
passport.use('refresh-token', refreshTokenStrategy);

type VerifyCallBack = (error: Error | null, user?: User | false) => void;
type SerializeCallback = (err: Error | null, id?: string) => void;

passport.serializeUser((user, done: SerializeCallback) => {
  done(null, user.id);
});

passport.deserializeUser(async function (id: string, done: VerifyCallBack) {
  const user = await prisma.user.findUnique({
    where: { id },
  });
  if (!user) return done(null, false);
  const safeUser = { ...user, name: user.name ?? '' };
  done(null, safeUser);
});

export default passport;
