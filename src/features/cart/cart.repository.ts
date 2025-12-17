import prisma from '../../lib/prisma';
import { AddCartItemBody } from './cart.schema';

export class CartRepository {
  async findCartByUserId(userId: string) {
    return prisma.cart.findUnique({
      where: { buyerId: userId },
      include: { items: true },
    });
  }

  async createCart(userId: string) {
    return prisma.cart.create({
      data: { buyerId: userId },
      include: { items: true },
    });
  }

  async findCart(userId: string) {
    return prisma.cart.findUnique({
      where: { buyerId: userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                store: true,
                stocks: {
                  include: { size: true },
                },
              },
            },
          },
        },
      },
    });
  }

  async updateCart(cartId: string, body: AddCartItemBody) {
    const { productId, sizes } = body;

    return prisma.$transaction(
      sizes.map((item) =>
        prisma.cartItem.upsert({
          where: {
            cartId_productId_sizeId: {
              cartId,
              productId,
              sizeId: item.sizeId,
            },
          },
          update: {
            quantity: {
              set: item.quantity,
            },
          },
          create: {
            cartId,
            productId,
            sizeId: item.sizeId,
            quantity: item.quantity,
          },
        }),
      ),
    );
  }

  async findByCartItemId(cartItemId: string) {
    return prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: {
        cart: true,
      },
    });
  }

  async deleteCartItem(cartItem: string) {
    await prisma.cartItem.delete({
      where: { id: cartItem },
    });
  }
}
