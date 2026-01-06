import { CategoryName } from '@prisma/client';
import prisma from '../../../src/lib/prisma';

/**
 * Product & Stock 시드 데이터
 * 각 상품은 특정 스토어에 귀속되며, 여러 사이즈의 재고를 가짐
 */
export const productData = [
  {
    id: 'product_1',
    name: '오버핏 코튼 티셔츠',
    price: 29000,
    content: '부드러운 면 소재의 데일리 오버핏 티셔츠입니다.',
    image: 'https://sprint-be-project.s3.ap-northeast-2.amazonaws.com/codiit/product_1.png',
    categoryName: CategoryName.TOP,
    storeId: 'store_1',
    stocks: [
      { sizeId: 2, quantity: 50 }, // S
      { sizeId: 3, quantity: 100 }, // M
      { sizeId: 4, quantity: 30 }, // L
    ],
  },
  {
    id: 'product_2',
    name: '슬림핏 생지 데님',
    price: 45000,
    content: '어디에나 잘 어울리는 깔끔한 실루엣의 생지 데님 팬츠입니다.',
    image: 'https://sprint-be-project.s3.ap-northeast-2.amazonaws.com/codiit/product_2.png',
    categoryName: CategoryName.BOTTOM,
    storeId: 'store_1',
    stocks: [
      { sizeId: 3, quantity: 20 }, // M
      { sizeId: 4, quantity: 20 }, // L
    ],
  },
  {
    id: 'product_3',
    name: '체크 플레어 원피스',
    price: 59000,
    content: '러블리한 무드의 체크 패턴 원피스입니다.',
    image: 'https://sprint-be-project.s3.ap-northeast-2.amazonaws.com/codiit/product_3.png',
    categoryName: CategoryName.DRESS,
    storeId: 'store_2',
    stocks: [
      { sizeId: 6, quantity: 15 }, // FREE
    ],
  },
];

/**
 * Product 시드 실행
 */
export async function seedProducts() {
  console.log('🌱 Seeding products and stocks...');

  for (const item of productData) {
    const { stocks, ...productInfo } = item;

    // ProductService의 로직처럼 트랜잭션으로 상품과 재고를 함께 처리
    await prisma.$transaction(async (tx) => {
      // 1. 상품 생성 또는 업데이트 (Upsert)
      const product = await tx.product.upsert({
        where: { id: productInfo.id },
        update: productInfo,
        create: productInfo,
      });

      // 2. 기존 재고 삭제 (ProductService의 updateProduct 로직 반영)
      await tx.stock.deleteMany({
        where: { productId: product.id },
      });

      // 3. 새 재고 생성
      if (stocks && stocks.length > 0) {
        await tx.stock.createMany({
          data: stocks.map((s) => ({
            productId: product.id,
            sizeId: s.sizeId,
            quantity: s.quantity,
          })),
        });
      }
    });

    console.log(`   ✅ ${productInfo.name} (Store: ${productInfo.storeId})`);
  }

  console.log('✨ Product seeding completed!\n');
}

// 직접 실행 시
if (import.meta.url === `file://${process.argv[1]}`) {
  seedProducts()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
