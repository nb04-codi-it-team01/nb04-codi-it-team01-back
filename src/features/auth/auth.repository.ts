import prisma from '../../lib/prisma';

export class AuthRepository {
  findByEmailWithGrade(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: {
        grade: true,
      },
    });
  }

  findUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async saveRefreshToken(userId: string, refreshToken: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken },
    });
  }

  async clearRefreshToken(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }
}
