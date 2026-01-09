import prisma from '../../src/lib/prisma';

/**
 * 테스트 DB 초기화 (데이터 삭제)
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
 * Grade 마스터 데이터
 * scripts/seeds/grade/grade.seed.ts와 동기화 필요
 */
const gradeData = [
  { id: 'grade_green', name: 'Green', rate: 1, minAmount: 0 },
  { id: 'grade_orange', name: 'Orange', rate: 3, minAmount: 100000 },
  { id: 'grade_red', name: 'Red', rate: 5, minAmount: 300000 },
  { id: 'grade_black', name: 'Black', rate: 7, minAmount: 500000 },
  { id: 'grade_vip', name: 'VIP', rate: 10, minAmount: 1000000 },
];

/**
 * 테스트 DB 시드 (Grade 데이터)
 *
 * 포함되는 데이터:
 * - Grade (5개: Green, Orange, Red, Black, VIP)
 *
 * TODO: 추후 Size, User, Store, Product 시드도 추가
 */
export async function seedTestDatabase() {
  // Grade 데이터 시드
  for (const grade of gradeData) {
    await prisma.grade.upsert({
      where: { id: grade.id },
      update: grade,
      create: grade,
    });
  }
}

/**
 * 하위 호환성을 위한 alias (기존 테스트 코드와 호환)
 * @deprecated seedTestDatabase 사용 권장
 */
export const ensureGradeExists = seedTestDatabase;

/**
 * 테스트 DB 연결 종료
 */
export async function disconnectDatabase() {
  await prisma.$disconnect();
}
