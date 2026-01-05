import prisma from '../../../src/lib/prisma';

/**
 * Store 시드 데이터
 */
export const storeData = [
  {
    id: 'store_1',
    name: 'CODI-IT 강남점',
    userId: 'user_seller_1',
    address: '서울특별시 강남구 테헤란로 123',
    detailAddress: '1동 1106호',
    phoneNumber: '010-1234-5678',
    content: '최고의 패션을 제공하는 CODI-IT 강남점입니다. 다양한 스타일의 옷을 만나보세요!',
    image: 'https://sprint-be-project.s3.ap-northeast-2.amazonaws.com/codiit/store_1.png',
  },
  {
    id: 'store_2',
    name: 'Fashion Hub',
    userId: 'user_seller_2',
    address: '서울특별시 서초구 서초대로 456',
    detailAddress: '3층 301호',
    phoneNumber: '010-9876-5432',
    content: '트렌디한 패션 아이템을 한곳에! Fashion Hub에서 만나보세요.',
    image: 'https://sprint-be-project.s3.ap-northeast-2.amazonaws.com/codiit/store_2.png',
  },
];

/**
 * Store 시드 실행
 */
export async function seedStores() {
  console.log('🌱 Seeding stores...');

  for (const store of storeData) {
    await prisma.store.upsert({
      where: { id: store.id },
      update: store,
      create: store,
    });
    console.log(`  ✅ ${store.name} (Owner: ${store.userId})`);
  }

  console.log('✨ Store seeding completed!\n');
}

// 직접 실행 시
if (require.main === module) {
  seedStores()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
