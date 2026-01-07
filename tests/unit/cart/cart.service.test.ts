import { CartService } from '../../../src/features/cart/cart.service';
import { CartRepository } from '../../../src/features/cart/cart.repository';
import { AppError } from '../../../src/shared/middleware/error-handler';
import { CartItem } from '@prisma/client';

describe('CartService', () => {
  let service: CartService;

  const mockCartRepository = {
    findCartByUserId: jest.fn(),
    createCart: jest.fn(),
    upsertCart: jest.fn(),
    updateCart: jest.fn(),
    findByCartItemId: jest.fn(),
    deleteCartItem: jest.fn(),
    findCartItemDetail: jest.fn(),
  };

  const MOCK_USER_ID = 'user-1';
  const NOW = new Date();

  const BASE_STORE = {
    id: 'store-1',
    userId: 'seller-1',
    name: '테스트 스토어',
    address: '서울시',
    phoneNumber: '010-1234-5678',
    content: '스토어 설명',
    image: 'store.jpg',
    createdAt: NOW,
    updatedAt: NOW,
    detailAddress: '101호',
  };

  const BASE_PRODUCT = {
    id: 'prod-1',
    storeId: 'store-1',
    name: '테스트 상품',
    price: 10000,
    image: 'product.jpg',
    discountRate: 10,
    discountStartTime: null,
    discountEndTime: null,
    createdAt: NOW,
    updatedAt: NOW,
    categoryName: '의류',
    content: '상품 설명',
    isSoldOut: false,
    store: BASE_STORE,
    reviews: [{ rating: 5 }, { rating: 4 }], // 리뷰 평균 계산용
    stocks: [
      {
        id: 'stock-1',
        productId: 'prod-1',
        sizeId: 1,
        quantity: 10,
        size: { id: 1, en: 'L', ko: '대', name: 'L' },
      },
    ],
  };

  const BASE_CART = {
    id: 'cart-1',
    buyerId: MOCK_USER_ID,
    createdAt: NOW,
    updatedAt: NOW,
    items: [] as CartItem[],
  };

  // 상세 조회용 아이템 (Product와 Cart가 조립된 형태)
  const MOCK_CART_ITEM_DETAIL = {
    id: 'item-1',
    cartId: 'cart-1',
    productId: 'prod-1',
    sizeId: 1,
    quantity: 2,
    createdAt: NOW,
    updatedAt: NOW,
    product: BASE_PRODUCT,
    cart: { ...BASE_CART, items: [{ quantity: 2 }] },
  };

  beforeEach(() => {
    service = new CartService(mockCartRepository as unknown as CartRepository);
    jest.clearAllMocks();
  });

  describe('createCart', () => {
    it('이미 장바구니가 존재하면 새로 생성하지 않고 기존 장바구니를 반환', async () => {
      // 기존 장바구니가 있는 상황 모킹
      const existingCart = {
        ...BASE_CART,
        items: [], // toCartResponseDto에서 quantity 계산을 위해 필요
      };
      mockCartRepository.findCartByUserId.mockResolvedValue(existingCart);

      const result = await service.createCart(MOCK_USER_ID);

      expect(mockCartRepository.findCartByUserId).toHaveBeenCalledWith(MOCK_USER_ID);
      expect(mockCartRepository.createCart).not.toHaveBeenCalled();
      expect(result.id).toBe(existingCart.id);
    });

    it('장바구니가 존재하지 않으면 장바구니를 생성', async () => {
      // 1. 처음엔 없고(null), 그 다음 생성되는 상황 모킹
      mockCartRepository.findCartByUserId.mockResolvedValue(null);
      const newCart = {
        ...BASE_CART,
        id: 'new-cart-id',
        items: [],
      };
      mockCartRepository.createCart.mockResolvedValue(newCart);

      const result = await service.createCart(MOCK_USER_ID);

      expect(mockCartRepository.createCart).toHaveBeenCalledWith(MOCK_USER_ID);
      expect(result.id).toBe('new-cart-id');
      // 매퍼가 작동하여 quantity가 0으로 계산되었는지 확인
      expect(result.quantity).toBe(0);
    });
  });

  describe('getCart', () => {
    it('장바구니 조회', async () => {
      const cartWithItems = {
        ...BASE_CART,
        items: [MOCK_CART_ITEM_DETAIL],
      };
      mockCartRepository.upsertCart.mockResolvedValue(cartWithItems);

      const result = await service.getCart(MOCK_USER_ID);

      expect(result.items[0].product.name).toBe(BASE_PRODUCT.name);
      expect(result.items[0].product.store.name).toBe(BASE_STORE.name);
      expect(result.items[0].product.reviewsRating).toBe(4.5); // (5+4)/2
    });
  });

  describe('updateCart', () => {
    it('장바구니가 존재하지 않을 때 404 에러를 던져야 한다 (getCartAndVerifyOwner)', async () => {
      // 장바구니 없음 모킹
      mockCartRepository.findCartByUserId.mockResolvedValue(null);

      await expect(
        service.updateCart(MOCK_USER_ID, { productId: 'p1', sizes: [] }),
      ).rejects.toThrow(new AppError(404, '장바구니를 찾을 수 없습니다.'));
    });

    it('장바구니 소유자가 다를 때 403 에러를 던져야 한다 (getCartAndVerifyOwner)', async () => {
      // 다른 사람의 장바구니 모킹
      mockCartRepository.findCartByUserId.mockResolvedValue({
        ...BASE_CART,
        buyerId: 'other-user',
      });
      await expect(
        service.updateCart(MOCK_USER_ID, { productId: 'p1', sizes: [] }),
      ).rejects.toThrow(new AppError(403, '권한이 없습니다.'));
    });

    it('장바구니 수정', async () => {
      mockCartRepository.findCartByUserId.mockResolvedValue(BASE_CART);
      mockCartRepository.updateCart.mockResolvedValue([MOCK_CART_ITEM_DETAIL]);

      const result = await service.updateCart(MOCK_USER_ID, {
        productId: 'prod-1',
        sizes: [{ sizeId: 1, quantity: 5 }],
      });

      expect(result[0].quantity).toBe(2);
      expect(mockCartRepository.updateCart).toHaveBeenCalled();
    });
  });

  describe('deleteCartItem', () => {
    it('장바구니 아이템이 존재하지 않을 때 404 에러를 던져야 한다', async () => {
      // 아이템 없음 모킹
      mockCartRepository.findCartItemDetail.mockResolvedValue(null);

      await expect(service.getCartItem(MOCK_USER_ID, 'item-1')).rejects.toThrow(
        new AppError(404, '장바구니에 아이템이 없습니다.'),
      );
    });

    it('타인의 아이템 삭제 시 403 에러를 던져야 한다', async () => {
      const otherItem = {
        ...MOCK_CART_ITEM_DETAIL,
        cart: { ...BASE_CART, buyerId: 'other-user' },
      };
      mockCartRepository.findByCartItemId.mockResolvedValue(otherItem);

      await expect(service.deleteCartItem(MOCK_USER_ID, 'item-1')).rejects.toThrow(
        new AppError(403, '권한이 없습니다.'),
      );
    });

    it('장바구니 아이템 삭제', async () => {
      mockCartRepository.findByCartItemId.mockResolvedValue(MOCK_CART_ITEM_DETAIL);

      await service.deleteCartItem(MOCK_USER_ID, 'item-1');

      expect(mockCartRepository.deleteCartItem).toHaveBeenCalledWith('item-1');
    });
  });

  describe('getCartItem', () => {
    it('상품 정보가 없는 아이템 조회 시 에러를 던져야 한다', async () => {
      // 1. product가 null인 비정상적인 데이터를 모킹
      const itemWithoutProduct = {
        ...MOCK_CART_ITEM_DETAIL,
        product: null,
      };
      mockCartRepository.findCartItemDetail.mockResolvedValue(itemWithoutProduct);

      await expect(service.getCartItem(MOCK_USER_ID, 'item-1')).rejects.toThrow(
        '상품 정보를 찾을 수 없습니다.',
      );
    });

    it('장바구니 아이템 상세 조회', async () => {
      mockCartRepository.findCartItemDetail.mockResolvedValue(MOCK_CART_ITEM_DETAIL);

      const result = await service.getCartItem(MOCK_USER_ID, 'item-1');

      // 10000원 - 10% 할인 = 9000원
      expect(result.product.discountPrice).toBe(9000);
      expect(result.cart.quantity).toBe(2);
    });
  });
});
