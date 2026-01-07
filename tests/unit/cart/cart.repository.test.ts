import { CartRepository } from '../../../src/features/cart/cart.repository';
import prisma from '../../../src/lib/prisma';

jest.mock('../../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    cart: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    cartItem: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn((input) => {
      if (typeof input === 'function') return input(jest.fn());
      return Promise.resolve(input);
    }),
  },
}));

describe('CartRepository', () => {
  let repository: CartRepository;

  beforeEach(() => {
    repository = new CartRepository();
    jest.clearAllMocks();
  });

  const mockUserId = 'user-1';
  const mockCartId = 'cart-1';

  describe('findCartByUserId', () => {
    it('userId로 장바구니 조회', async () => {
      await repository.findCartByUserId(mockUserId);
      expect(prisma.cart.findUnique).toHaveBeenCalledWith({
        where: { buyerId: mockUserId },
        include: { items: true },
      });
    });
  });

  describe('createCart', () => {
    it('장바구니 생성', async () => {
      const mockCreatedCart = { id: 'cart-123', buyerId: mockUserId, items: [] };
      (prisma.cart.create as jest.Mock).mockResolvedValue(mockCreatedCart);

      const result = await repository.createCart(mockUserId);

      expect(prisma.cart.create).toHaveBeenCalledWith({
        data: { buyerId: mockUserId },
        include: { items: true },
      });
      expect(result).toEqual(mockCreatedCart);
    });
  });

  describe('upsertCart', () => {
    it('장바구니 조회 시 존재하지 않는다면 장바구니 생성', async () => {
      (prisma.cart.upsert as jest.Mock).mockResolvedValue({ id: 'cart-1' });

      await repository.upsertCart(mockUserId);

      expect(prisma.cart.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { buyerId: mockUserId },
          include: expect.objectContaining({
            items: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe('updateCart (Transaction)', () => {
    it('장바구니 수정 시 트랜잭션 내에서 upsert가 호출되어야 한다', async () => {
      const mockBody = {
        productId: 'prod-1',
        sizes: [
          { sizeId: 1, quantity: 2 },
          { sizeId: 2, quantity: 5 },
        ],
      };

      await repository.updateCart(mockCartId, mockBody);

      expect(prisma.$transaction).toHaveBeenCalled();
      // sizes 배열이 2개이므로 upsert도 2번 호출
      expect(prisma.cartItem.upsert).toHaveBeenCalledTimes(2);

      // 첫 번째 데이터(sizeId: 1) 검증
      expect(prisma.cartItem.upsert).toHaveBeenNthCalledWith(1, {
        where: {
          cartId_productId_sizeId: {
            cartId: mockCartId,
            productId: mockBody.productId,
            sizeId: mockBody.sizes[0].sizeId,
          },
        },
        update: { quantity: { set: mockBody.sizes[0].quantity } },
        create: {
          cartId: mockCartId,
          productId: mockBody.productId,
          sizeId: mockBody.sizes[0].sizeId,
          quantity: mockBody.sizes[0].quantity,
        },
      });

      // 두 번째 데이터(sizeId: 2) 검증
      expect(prisma.cartItem.upsert).toHaveBeenNthCalledWith(2, {
        where: {
          cartId_productId_sizeId: {
            cartId: mockCartId,
            productId: mockBody.productId,
            sizeId: 2,
          },
        },
        update: { quantity: { set: 5 } },
        create: {
          cartId: mockCartId,
          productId: mockBody.productId,
          sizeId: 2,
          quantity: 5,
        },
      });
    });
  });

  describe('findByCartItemId', () => {
    it('장바구니 아이템 조회 ', async () => {
      const mockCartItemId = 'item-123';
      const mockCartItem = {
        id: mockCartItemId,
        cartId: 'cart-456',
        productId: 'product-789',
        quantity: 1,
        cart: { id: 'cart-456', buyerId: 'user-1' },
      };

      (prisma.cartItem.findUnique as jest.Mock).mockResolvedValue(mockCartItem);

      const result = await repository.findByCartItemId(mockCartItemId);

      expect(prisma.cartItem.findUnique).toHaveBeenCalledWith({
        where: { id: mockCartItemId },
        include: { cart: true },
      });
      expect(result).toEqual(mockCartItem);
    });
  });

  describe('deleteCartItem', () => {
    it('장바구니 아이템 삭제', async () => {
      const cartItemId = 'item-123';

      (prisma.cartItem.delete as jest.Mock).mockResolvedValue({ id: cartItemId });

      const result = await repository.deleteCartItem(cartItemId);

      expect(prisma.cartItem.delete).toHaveBeenCalledWith({
        where: { id: cartItemId },
      });
      expect(result.id).toBe(cartItemId);
    });
  });

  describe('findCartItemDetail', () => {
    it('cartItem 상세 조회', async () => {
      const mockCartItemId = 'item-999';
      // 반환값이 undefined가 되지 않도록 빈 객체라도 모킹
      (prisma.cartItem.findUnique as jest.Mock).mockResolvedValue({});

      await repository.findCartItemDetail(mockCartItemId);

      expect(prisma.cartItem.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockCartItemId },
          include: expect.objectContaining({
            product: expect.any(Object),
            cart: expect.any(Object),
          }),
        }),
      );
    });
  });
});
