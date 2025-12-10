import { Strategy as LocalStrategy } from 'passport-local';
import prisma from '../prisma';
import bcrypt from 'bcrypt';
//import { AuthService } from './authService.js';
import { User } from '@prisma/client';

//const authService = new AuthService(prisma); // 의존성 주입

type verifyCb = (error: Error | null, user?: User | false, info?: { message: string }) => void;

export const localStrategy = new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password',
  },
  async (email: string, password: string, cb: verifyCb) => {
    try {
      console.log('🔐 localStrategy called', { email, password });

      const user = await prisma.user.findUnique({
        where: { email },
      });
      console.log('🔐 user from DB', user);

      if (!user || !user.password)
        return cb(null, false, { message: '해당 유저가 존재하지 않습니다.' });

      const isMatched = await bcrypt.compare(password, user.password);
      console.log('🔐 password matched?', isMatched);

      if (!isMatched) {
        return cb(null, false, { message: '잘못된 비밀번호입니다.' });
      } else {
        return cb(null, user);
      }
    } catch (error) {
      cb(error as Error);
    }
  },
);
