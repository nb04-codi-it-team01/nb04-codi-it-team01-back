import prisma from '../../../src/lib/prisma';

/**
 * Size 기초 데이터
 * id를 수동으로 지정하여 다른 시드(Product, Order)에서 참조하기 쉽게 합니다.
 */
const sizes = [
  { id: 1, en: 'XS', ko: 'XS' },
  { id: 2, en: 'S', ko: 'S' },
  { id: 3, en: 'M', ko: 'M' },
  { id: 4, en: 'L', ko: 'L' },
  { id: 5, en: 'XL', ko: 'XL' },
  { id: 6, en: 'FREE', ko: 'FREE' },
];

/**
 * Size 시드 실행 함수
 */
export async function seedSizes() {
  console.log('🌱 Seeding sizes...');

  for (const size of sizes) {
    await prisma.size.upsert({
      where: { id: size.id },
      update: {},
      create: size,
    });
  }

  console.log(`   ✅ ${sizes.length} sizes seeded.`);
  console.log('✨ Size seeding completed!\n');
}
