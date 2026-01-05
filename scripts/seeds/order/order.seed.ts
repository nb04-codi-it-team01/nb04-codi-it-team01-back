// import { PaymentStatus, Prisma } from '@prisma/client';
// import prisma from '../../../src/lib/prisma';

// export async function seedOrders() {
//   console.log('🌱 Seeding Orders and Carts...');

//   const userId = 'user_buyer_1'; // 주문을 소유할 구매자 ID
//   const productId = 'product_1'; // 앞서 생성한 상품 ID
//   const sizeId = 1; // 앞서 생성한 사이즈 ID

//   // 1. 임시 장바구니(Cart) 생성
//   // 유저에게 기존 장바구니가 있을 수 있으므로 upsert 사용
//   await prisma.cart.upsert({
//     where: { buyerId: userId },
//     update: {},
//     create: {
//       buyerId: userId,
//       items: {
//         create: [
//           {
//             productId: productId,
//             sizeId: sizeId,
//             quantity: 2,
//           },
//         ],
//       },
//     },
//   });
//   console.log(`   ✅ Temporary Cart created for ${userId}`);

//   // 2. WaitingPayment 상태의 주문 2개 생성
//   const orderData = [
//     { id: 'order_test_1', subtotal: 58000, quantity: 2 },
//     { id: 'order_test_2', subtotal: 29000, quantity: 1 },
//   ];

//   for (const data of orderData) {
//     await prisma.$transaction(async (tx) => {
//       // 주문 생성
//       const order = await tx.order.upsert({
//         where: { id: data.id },
//         update: {},
//         create: {
//           id: data.id,
//           buyerId: userId,
//           name: '홍길동',
//           phoneNumber: '010-1111-2222',
//           address: '서울시 강남구 역삼동',
//           totalQuantity: data.quantity,
//           subtotal: data.subtotal,
//           usePoint: 0,
//         },
//       });

//       // 주문 아이템 생성
//       await tx.orderItem.create({
//         data: {
//           orderId: order.id,
//           productId: productId,
//           sizeId: sizeId,
//           quantity: data.quantity,
//           price: 29000,
//         },
//       });

//       // 결제 정보 생성 (WaitingPayment 상태)
//       await tx.payment.upsert({
//         where: { orderId: order.id },
//         update: { status: PaymentStatus.WaitingPayment },
//         create: {
//           orderId: order.id,
//           price: data.subtotal,
//           status: PaymentStatus.WaitingPayment,
//         },
//       });
//     });
//     console.log(`   ✅ Order ${data.id} created (Status: WaitingPayment)`);
//   }

//   console.log('✨ Order seeding completed!\n');
// }

// 직접 실행 시
export async function seedOrders() {
  console.log('⚠️  Order seeding is currently disabled.\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedOrders()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      console.log('Done.');
    });
}
