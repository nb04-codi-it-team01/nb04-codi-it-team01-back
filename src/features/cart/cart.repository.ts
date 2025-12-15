import prisma from '../../lib/prisma';

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
}
