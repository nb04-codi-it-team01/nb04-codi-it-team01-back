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
}
