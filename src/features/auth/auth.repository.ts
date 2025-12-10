import prisma from '../../lib/prisma';
import { PrismaClient } from '@prisma/client';
//import type { loginDTO } from './auth.dto';
export class AuthRepository {
  constructor(private prisma: PrismaClient) {}
  findByEmail(email: string) {
    console.log(email);
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        password: true,
      },
    });
  }
  findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }
}
