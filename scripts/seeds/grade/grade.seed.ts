import prisma from '../../../src/lib/prisma';

/**
 * Grade(등급) 시드 데이터
 * 프론트엔드 Level 데이터와 매칭
 */
export const gradeData = [
  {
    id: 'grade_green',
    name: 'Green',
    rate: 0,
    minAmount: 0,
  },
  {
    id: 'grade_orange',
    name: 'Orange',
    rate: 3,
    minAmount: 100000,
  },
  {
    id: 'grade_red',
    name: 'Red',
    rate: 5,
    minAmount: 300000,
  },
  {
    id: 'grade_black',
    name: 'Black',
    rate: 7,
    minAmount: 500000,
  },
  {
    id: 'grade_vip',
    name: 'VIP',
    rate: 10,
    minAmount: 1000000,
  },
];

/**
 * Grade 시드 실행
 */
export async function seedGrades() {
  console.log('🌱 Seeding grades...');

  for (const grade of gradeData) {
    await prisma.grade.upsert({
      where: { id: grade.id },
      update: grade,
      create: grade,
    });
    console.log(
      `  ✅ ${grade.name} (rate: ${grade.rate}%, min: ${grade.minAmount.toLocaleString()}원)`,
    );
  }

  console.log('✨ Grade seeding completed!\n');
}
