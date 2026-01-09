import prisma from '../../lib/prisma';
import type { UserType } from '@prisma/client';

export class UserRepository {
  // 이메일로 유저 찾기
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: {
        grade: true,
      },
    });
  }

  // ID로 유저 찾기
  async findById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        grade: true,
      },
    });
  }

  // 유저 생성
  async create(data: {
    name: string;
    email: string;
    password: string;
    type: UserType;
    image?: string;
  }) {
    // 기본 등급 찾기 (가장 낮은 minAmount)
    const defaultGrade = await prisma.grade.findFirst({
      orderBy: {
        minAmount: 'asc',
      },
    });

    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.password,
        type: data.type,
        image:
          data.image ||
          'https://codiit-team1-images.s3.ap-northeast-2.amazonaws.com/upload/default-profile.png',
        gradeId: defaultGrade?.id,
      },
      include: {
        grade: true,
      },
    });
  }

  // 유저 정보 수정
  async update(
    userId: string,
    data: {
      name?: string;
      password?: string;
      image?: string;
    },
  ) {
    return prisma.user.update({
      where: { id: userId },
      data,
      include: {
        grade: true,
      },
    });
  }

  // 유저 삭제
  async delete(userId: string) {
    return prisma.user.delete({
      where: { id: userId },
    });
  }

  // 관심 스토어 조회
  async findUserLikes(userId: string) {
    return prisma.userLike.findMany({
      where: { userId },
      include: {
        store: true,
      },
    });
  }
}
