import prisma from '../../../src/lib/prisma';

/**
 * Grade(등급) 시드 데이터
 */
export const gradeData = [
  {
    id: 'grade_bronze',
    name: 'BRONZE',
    rate: 0,
    minAmount: 0,
  },
  {
    id: 'grade_silver',
    name: 'SILVER',
    rate: 3,
    minAmount: 100000,
  },
  {
    id: 'grade_gold',
    name: 'GOLD',
    rate: 5,
    minAmount: 500000,
  },
  {
    id: 'grade_platinum',
    name: 'PLATINUM',
    rate: 7,
    minAmount: 1000000,
  },
  {
    id: 'grade_diamond',
    name: 'DIAMOND',
    rate: 10,
    minAmount: 5000000,
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
