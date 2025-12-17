import type { RequestHandler } from 'express';
import prisma from '../../lib/prisma';

export const attachTestOrderContext: RequestHandler = async (req, _res, next) => {
  try {
    const buyerId = req.user!.id; // mockAuth에서 이미 보장됨

    /** 1. BUYER */
    await prisma.user.upsert({
      where: { id: buyerId },
      update: {},
      create: {
        id: buyerId,
        name: 'Mock Buyer',
        email: 'mock@test.com',
        password: 'fake',
        type: 'BUYER',
      },
    });

    /** 2. SELLER + STORE */
    const seller = await prisma.user.upsert({
      where: { email: 'seller@test.com' },
      update: {},
      create: {
        name: 'Mock Seller',
        email: 'seller@test.com',
        password: 'fake',
        type: 'SELLER',
      },
    });

    const store = await prisma.store.upsert({
      where: { userId: seller.id },
      update: {},
      create: {
        userId: seller.id,
        name: 'Mock Store',
        address: '서울',
        phoneNumber: '000-0000',
        content: 'Mock Content',
      },
    });

    /** 3. SIZE */
    await prisma.size.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, en: 'M', ko: '미디움' },
    });

    /** 4. PRODUCT */
    const product = await prisma.product.findFirst({
      where: {
        storeId: store.id,
        name: '테스트 상품',
      },
    });

    if (!product) {
      throw new Error('상품 없음');
    }

    await prisma.product.create({
      where: { id: product.id },
      data: {
        storeId: store.id,
        name: 'mock test',
        price: 10000,
        categoryName: 'ACC',
      },
    });

    await prisma.product.update({
      where: { id: product.id },
      data: {
        price: 12000,
      },
    });

    /** 5. STOCK */
    await prisma.stock.upsert({
      where: {
        productId_sizeId: {
          productId: product.id,
          sizeId: 1,
        },
      },
      update: { quantity: 100 },
      create: {
        productId: product.id,
        sizeId: 1,
        quantity: 100,
      },
    });

    /** 6. CART */
    const cart = await prisma.cart.upsert({
      where: { buyerId },
      update: {},
      create: { buyerId },
    });

    /** 7. CART ITEM */
    const exists = await prisma.cartItem.findFirst({
      where: { cartId: cart.id },
    });

    if (!exists) {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          sizeId: 1,
          quantity: 2,
        },
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};
