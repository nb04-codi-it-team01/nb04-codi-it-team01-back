import prisma from '../src/lib/prisma';

/**
 * 데이터베이스 초기화 (모든 데이터 삭제)
 *
 * 주의: 프로덕션 환경에서는 절대 실행하지 마세요
 */
async function clearDatabase() {
  console.log('\n🗑️  Clearing database...\n');
  console.log('='.repeat(50));

  const isDevelopment = process.env.NODE_ENV !== 'production';

  if (!isDevelopment) {
    console.error('❌ Cannot clear database in production!');
    process.exit(1);
  }

  try {
    // 외래키 제약 조건 순서에 따라 삭제
    const userLikes = await prisma.userLike.deleteMany();
    console.log(`✅ Deleted ${userLikes.count} user likes`);

    const stores = await prisma.store.deleteMany();
    console.log(`✅ Deleted ${stores.count} stores`);

    const users = await prisma.user.deleteMany();
    console.log(`✅ Deleted ${users.count} users`);

    const grades = await prisma.grade.deleteMany();
    console.log(`✅ Deleted ${grades.count} grades`);

    console.log('='.repeat(50));
    console.log('✨ Database cleared successfully!\n');
  } catch (error) {
    console.error('\n❌ Error clearing database:', error);
    throw error;
  }
}

// 직접 실행 시
if (require.main === module) {
  clearDatabase()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { clearDatabase };
