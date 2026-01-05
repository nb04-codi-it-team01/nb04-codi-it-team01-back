import prisma from '../../../src/lib/prisma';
import bcrypt from 'bcrypt';
import { UserType } from '@prisma/client';

/**
 * User 시드 데이터
 */
export const userData = [
  {
    id: 'user_buyer_1',
    name: '김구매',
    email: 'buyer1@example.com',
    password: 'password123',
    type: UserType.BUYER,
    points: 50000,
    gradeId: 'grade_green',
  },
  {
    id: 'user_buyer_2',
    name: '이구매',
    email: 'buyer2@example.com',
    password: 'password123',
    type: UserType.BUYER,
    points: 150000,
    gradeId: 'grade_orange',
  },
  {
    id: 'user_buyer_3',
    name: '박구매',
    email: 'buyer3@example.com',
    password: 'password123',
    type: UserType.BUYER,
    points: 600000,
    gradeId: 'grade_black',
  },
  {
    id: 'user_seller_1',
    name: '박판매',
    email: 'seller1@example.com',
    password: 'password123',
    type: UserType.SELLER,
    points: 0,
    gradeId: 'grade_green',
  },
  {
    id: 'user_seller_2',
    name: '최판매',
    email: 'seller2@example.com',
    password: 'password123',
    type: UserType.SELLER,
    points: 0,
    gradeId: 'grade_green',
  },
];

/**
 * User 시드 실행
 */
export async function seedUsers() {
  console.log('🌱 Seeding users...');

  for (const user of userData) {
    const hashedPassword = await bcrypt.hash(user.password, 10);

    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        name: user.name,
        email: user.email,
        password: hashedPassword,
        type: user.type,
        points: user.points,
        gradeId: user.gradeId,
      },
      create: {
        id: user.id,
        name: user.name,
        email: user.email,
        password: hashedPassword,
        type: user.type,
        points: user.points,
        gradeId: user.gradeId,
      },
    });
    console.log(`  ✅ ${user.name} (${user.email}) - ${user.type}`);
  }

  console.log('✨ User seeding completed!\n');
}

// 직접 실행 시
if (import.meta.url === `file://${process.argv[1]}`) {
  seedUsers()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
