import prisma from '../../src/lib/prisma';

/**
 * 테스트 DB 초기화
 */
export async function clearDatabase() {
  // 순서 중요: 외래키 참조 순서 고려
  await prisma.inquiryReply.deleteMany();
  await prisma.inquiry.deleteMany();
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.userLike.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.product.deleteMany();
  await prisma.store.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.user.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.size.deleteMany();
}

/**
 * Grade 데이터 생성 (테스트용)
 * 동시 실행 시 race condition 발생 가능하므로 try-catch로 처리
 */
export async function ensureGradeExists() {
  try {
    const existingGrade = await prisma.grade.findUnique({
      where: { name: 'BRONZE' },
    });

    if (!existingGrade) {
      await prisma.grade.create({
        data: {
          name: 'BRONZE',
          rate: 0,
          minAmount: 0,
        },
      });
    }
  } catch (error) {
    // 동시에 여러 테스트가 실행되어 unique constraint 위반 시 무시
    // 이미 다른 테스트에서 생성했다면 문제없음
    if (error instanceof Error && !error.message.includes('Unique constraint')) {
      throw error;
    }
  }
}

/**
 * 테스트 DB 연결 종료
 */
export async function disconnectDatabase() {
  await prisma.$disconnect();
}
