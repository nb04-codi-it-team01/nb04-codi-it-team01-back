import prisma from '../src/lib/prisma';
import { seedGrades } from './seeds/grade/grade.seed';
import { seedSizes } from './seeds/size/size.seed';
import { seedUsers } from './seeds/user/user.seed';
import { seedStores } from './seeds/store/store.seed';
import { seedProducts } from './seeds/product/product.seed';
import { seedOrders } from './seeds/order/order.seed';

/**
 * 모든 시드 데이터를 순서대로 실행
 *
 * 실행 순서:
 * 1. Grade (다른 테이블의 외래키로 사용)
 * 2. User (Store의 외래키로 사용)
 * 3. Store
 */
async function seedAll() {
  console.log('\n🚀 Starting database seeding...\n');
  console.log('='.repeat(50));

  try {
    // 1. Grades 시드
    await seedGrades();

    await seedSizes();

    // 2. Users 시드 (Grades에 의존)
    await seedUsers();

    // 3. Stores 시드 (Users에 의존)
    await seedStores();

    // 4. Product 시드 (Store에 의존)
    await seedProducts();

    // 5. Order 시드 (cartId에 의존/현재 이 branch에서 등록 안됨)
    await seedOrders();

    console.log('='.repeat(50));
    console.log('🎉 All seeding completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    throw error;
  }
}

// 직접 실행 시
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAll()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { seedAll };
