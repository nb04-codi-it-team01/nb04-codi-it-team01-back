import { ProductRepository } from '../../../src/features/product/product.repository';
import prisma from '../../../src/lib/prisma';
import { CategoryName, Prisma } from '@prisma/client';

jest.mock('../../../src/lib/prisma', () => ({
  store: { findFirst: jest.fn() },
  product: {
    findUnique: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  inquiry: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  stock: { createMany: jest.fn(), deleteMany: jest.fn() },
}));

describe('ProductRepository', () => {
  let productRepository: ProductRepository;
  const mockTx = {
    product: {
      create: jest.fn(),
      update: jest.fn(),
    },
    stock: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  } as unknown as Prisma.TransactionClient;

  beforeEach(() => {
    productRepository = new ProductRepository();
    jest.clearAllMocks();
  });

  // 기본 조회

  describe('findStoreByUserId', () => {
    it('userId로 스토어를 조회', async () => {
      const userId = 'user-1';
      await productRepository.findStoreByUserId(userId);

      expect(prisma.store.findFirst).toHaveBeenCalledWith({
        where: { userId },
      });
    });
  });

  describe('findProductDetail', () => {
    it('상품 상세 정보 조회', async () => {
      const productId = 'prod-1';
      await productRepository.findProductDetail(productId);

      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: productId },
        include: expect.objectContaining({
          store: true,
          stocks: expect.anything(),
          reviews: true,
          inquiries: expect.anything(),
        }),
      });
    });
  });

  describe('findProductWithStore', () => {
    it('상품과 스토어 정보를 조회', async () => {
      const productId = 'prod-1';
      await productRepository.findProductWithStore(productId);

      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: productId },
        include: { store: true },
      });
    });
  });

  describe('delete', () => {
    it('상품 삭제', async () => {
      const productId = 'prod-1';
      await productRepository.delete(productId);

      expect(prisma.product.delete).toHaveBeenCalledWith({
        where: { id: productId },
      });
    });
  });

  // 문의

  describe('createInquiry', () => {
    it('문의 생성', async () => {
      const params = {
        title: '문의',
        content: '내용',
        isSecret: true,
      };
      await productRepository.createInquiry('user-1', 'prod-1', 'store-1', params);

      expect(prisma.inquiry.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          productId: 'prod-1',
          storeId: 'store-1',
          ...params,
        },
      });
    });
  });

  describe('findInquiriesByProductId', () => {
    const productId = 'prod-1';
    const page = 1;
    const pageSize = 10;

    it('판매자는 모든 문의(비밀글 포함)를 조회', async () => {
      (prisma.inquiry.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.inquiry.count as jest.Mock).mockResolvedValue(0);

      await productRepository.findInquiriesByProductId(productId, 'seller-1', true, page, pageSize);

      expect(prisma.inquiry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { productId },
          skip: 0,
          take: 10,
        }),
      );
    });

    it('로그인한 일반 유저는 공개글 + 내 비밀글을 조회', async () => {
      (prisma.inquiry.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.inquiry.count as jest.Mock).mockResolvedValue(0);

      const userId = 'buyer-1';
      await productRepository.findInquiriesByProductId(productId, userId, false, page, pageSize);

      expect(prisma.inquiry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            productId,
            OR: [{ isSecret: false }, { userId }],
          },
        }),
      );
    });

    it('비로그인 유저는 공개글만 조회', async () => {
      (prisma.inquiry.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.inquiry.count as jest.Mock).mockResolvedValue(0);

      await productRepository.findInquiriesByProductId(productId, undefined, false, page, pageSize);

      expect(prisma.inquiry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            productId,
            OR: [{ isSecret: false }],
          },
        }),
      );
    });
  });

  // 트랜잭션

  describe('createProduct (Transaction)', () => {
    it('트랜잭션 객체를 통해 상품을 생성', async () => {
      const params = {
        storeId: 'store-1',
        name: 'New Product',
        price: 1000,
        categoryName: CategoryName.TOP,
      };

      await productRepository.createProduct(mockTx, params);

      expect(mockTx.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'New Product',
          storeId: 'store-1',
        }),
      });
    });
  });

  describe('createStocks (Transaction)', () => {
    it('재고가 있으면 createMany를 호출', async () => {
      const stocks = [{ sizeId: 1, quantity: 10 }];
      await productRepository.createStocks(mockTx, 'prod-1', stocks);

      expect(mockTx.stock.createMany).toHaveBeenCalledWith({
        data: [{ productId: 'prod-1', sizeId: 1, quantity: 10 }],
      });
    });

    it('재고 배열이 비어있으면 동작 없음', async () => {
      await productRepository.createStocks(mockTx, 'prod-1', []);
      expect(mockTx.stock.createMany).not.toHaveBeenCalled();
    });
  });

  describe('updateProduct (Transaction)', () => {
    it('트랜잭션 객체를 통해 상품을 수정', async () => {
      const updateData = { name: 'Updated' };
      await productRepository.updateProduct(mockTx, 'prod-1', updateData);

      expect(mockTx.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: updateData,
      });
    });
  });

  describe('deleteStocksByProductId (Transaction)', () => {
    it('해당 상품의 모든 재고를 삭제', async () => {
      await productRepository.deleteStocksByProductId(mockTx, 'prod-1');

      expect(mockTx.stock.deleteMany).toHaveBeenCalledWith({
        where: { productId: 'prod-1' },
      });
    });
  });
});
