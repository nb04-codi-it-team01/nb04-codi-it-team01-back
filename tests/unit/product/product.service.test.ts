import { ProductService } from '../../../src/features/product/product.service';
import { ProductRepository } from '../../../src/features/product/product.repository';
import { AppError } from '../../../src/shared/middleware/error-handler';
import { UserType, CategoryName, Store, InquiryStatus, Prisma } from '@prisma/client';
import prisma from '../../../src/lib/prisma';
import type {
  CreateProductBody,
  GetProductsQuery,
} from '../../../src/features/product/product.schema';
import type { UpdateProductDto } from '../../../src/features/product/product.dto';
import {
  InquiryWithRelations,
  ProductWithDetailRelations,
} from '../../../src/features/product/product.type';

// 의존성 모킹
jest.mock('../../../src/features/product/product.repository');
jest.mock('../../../src/features/product/product.mapper', () => ({
  ProductMapper: {
    toDetailDto: jest.fn((v) => v),
    toInquiryDto: jest.fn((v) => v),
    toInquiryListDto: jest.fn((v) => v),
    toListDto: jest.fn((v) => v),
  },
}));
// prisma 모킹 (트랜잭션 테스트를 위해 필요)
const txStub = { __tx: true } as unknown as Prisma.TransactionClient;
jest.mock('../../../lib/prisma', () => ({
  $transaction: jest.fn(async (callback) => callback(txStub)),
  product: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
}));

describe('ProductService', () => {
  let productService: ProductService;
  let mockProductRepository: jest.Mocked<ProductRepository>;

  // 상수 및 Mock 데이터 정의
  const sellerUserId = 'seller-user-123';
  const buyerUserId = 'buyer-user-456';
  const productId = 'prod-123';

  const mockStore: Store = {
    id: 'store-789',
    userId: sellerUserId,
    name: '테스트스토어',
    address: '서울시 강남구',
    detailAddress: null,
    phoneNumber: '010-1234-5678',
    content: '스토어 설명',
    image: 'store_image.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProductDetail: ProductWithDetailRelations = {
    id: productId,
    storeId: mockStore.id,
    name: '테스트상품',
    price: 10000,
    content: '설명',
    image: 'img.jpg',
    categoryName: CategoryName.OUTER,
    isSoldOut: false,
    discountRate: 0,
    discountStartTime: null,
    discountEndTime: null,
    store: mockStore,
    stocks: [
      {
        id: 'stock-1',
        productId,
        sizeId: 1,
        quantity: 10,
        size: { id: 1, ko: 'M', en: 'Medium' },
      },
    ],
    reviews: [],
    inquiries: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInquiry = {
    id: 'inquiry-1',
    productId,
    userId: buyerUserId,
    title: '문의 제목',
    content: '문의 내용',
    isSecret: false,
    status: InquiryStatus.WaitingAnswer,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockProductRepository = new ProductRepository() as jest.Mocked<ProductRepository>;
    productService = new ProductService(mockProductRepository);
  });

  // 상품 생성 (createProduct)
  describe('createProduct', () => {
    const createBody: CreateProductBody = {
      name: '새 상품',
      price: 20000,
      categoryName: 'TOP',
      stocks: [{ sizeId: 1, quantity: 10 }],
      content: '새 상품 내용',
      image: 'new_image.jpg',
      discountRate: 0,
      discountStartTime: undefined,
      discountEndTime: undefined,
    };

    it('스토어 오너가 상품 생성 성공 (트랜잭션 포함)', async () => {
      // 1. 준비: Mock 설정
      mockProductRepository.findStoreByUserId.mockResolvedValue(mockStore);
      // createProduct 호출 시 임시 상품 객체 반환
      mockProductRepository.createProduct.mockResolvedValue(mockProductDetail);
      // 최종 결과 조회를 위한 Mock
      mockProductRepository.findProductDetail.mockResolvedValue(mockProductDetail);

      // 2. 실행
      const result = await productService.createProduct(createBody, sellerUserId);

      // 3. 검증
      expect(mockProductRepository.findStoreByUserId).toHaveBeenCalledWith(sellerUserId);
      expect(prisma.$transaction).toHaveBeenCalled(); // 트랜잭션 호출 확인
      expect(mockProductRepository.createProduct).toHaveBeenCalledWith(
        txStub,
        expect.objectContaining({
          storeId: mockStore.id,
          name: createBody.name,
          categoryName: CategoryName.TOP,
        }),
      );
      expect(mockProductRepository.createStocks).toHaveBeenCalledWith(
        txStub,
        productId,
        createBody.stocks,
      );
      expect(mockProductRepository.findProductDetail).toHaveBeenCalledWith(productId);
      expect(result.id).toBe(productId);
    });

    it('스토어가 존재하지 않으면 404 에러 발생', async () => {
      // 1. 준비
      mockProductRepository.findStoreByUserId.mockResolvedValue(null);

      // 2. 실행 및 검증
      await expect(productService.createProduct(createBody, sellerUserId)).rejects.toThrow(
        new AppError(404, '스토어가 존재하지 않습니다.'),
      );

      // 3. 검증: DB 생성 작업이 일어나지 않았는지 확인
      expect(mockProductRepository.createProduct).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  // 상품 수정 (updateProduct)
  describe('updateProduct', () => {
    const updateBody: UpdateProductDto = {
      id: productId,
      name: '변경된 상품명',
      stocks: [{ sizeId: 1, quantity: 15 }],
    };

    it('본인 스토어의 상품 수정 성공 (트랜잭션 포함)', async () => {
      // 1. 준비
      mockProductRepository.findStoreByUserId.mockResolvedValue(mockStore);
      mockProductRepository.findProductWithStore.mockResolvedValue(mockProductDetail);
      mockProductRepository.findProductDetail.mockResolvedValue({
        ...mockProductDetail,
        name: '변경된 상품명',
      });

      // 2. 실행
      const result = await productService.updateProduct(updateBody, sellerUserId);

      // 3. 검증
      expect(mockProductRepository.findStoreByUserId).toHaveBeenCalledWith(sellerUserId);
      expect(mockProductRepository.findProductWithStore).toHaveBeenCalledWith(productId);
      expect(prisma.$transaction).toHaveBeenCalled();

      // 트랜잭션 내부 호출 검증
      expect(mockProductRepository.updateProduct).toHaveBeenCalledWith(
        txStub,
        productId,
        expect.objectContaining({ name: '변경된 상품명' }),
      );
      expect(mockProductRepository.deleteStocksByProductId).toHaveBeenCalledWith(txStub, productId);
      expect(mockProductRepository.createStocks).toHaveBeenCalledWith(
        txStub,
        productId,
        updateBody.stocks,
      );
      expect(result.name).toBe('변경된 상품명');
    });

    it('스토어가 존재하지 않으면 404 에러 발생', async () => {
      // 1. 준비
      mockProductRepository.findStoreByUserId.mockResolvedValue(null);

      // 2. 실행 및 검증
      await expect(productService.updateProduct(updateBody, sellerUserId)).rejects.toThrow(
        new AppError(404, '스토어가 존재하지 않습니다.'),
      );
      expect(mockProductRepository.findProductWithStore).not.toHaveBeenCalled();
    });

    it('상품이 존재하지 않으면 404 에러 발생', async () => {
      // 1. 준비
      mockProductRepository.findStoreByUserId.mockResolvedValue(mockStore);
      mockProductRepository.findProductWithStore.mockResolvedValue(null);

      // 2. 실행 및 검증
      await expect(productService.updateProduct(updateBody, sellerUserId)).rejects.toThrow(
        new AppError(404, '상품을 찾을 수 없습니다'),
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('본인 스토어 상품이 아니면 403 에러 발생', async () => {
      // 1. 준비 (다른 스토어 ID를 가진 상품)
      const anotherStoreProduct = { ...mockProductDetail, storeId: 'another-store' };
      mockProductRepository.findStoreByUserId.mockResolvedValue(mockStore);
      mockProductRepository.findProductWithStore.mockResolvedValue(anotherStoreProduct);

      // 2. 실행 및 검증
      await expect(productService.updateProduct(updateBody, sellerUserId)).rejects.toThrow(
        new AppError(403, '본인 스토어의 상품만 수정할 수 있습니다'),
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('수정 요청에 포함되지 않은 필드(price 등)는 업데이트 인자에 포함되지 않아야 함', async () => {
      const partialUpdateBody: UpdateProductDto = {
        id: productId,
        name: '이름만변경',
        stocks: [{ sizeId: 1, quantity: 5 }],
      };

      mockProductRepository.findStoreByUserId.mockResolvedValue(mockStore);
      mockProductRepository.findProductWithStore.mockResolvedValue(mockProductDetail);
      mockProductRepository.findProductDetail.mockResolvedValue(mockProductDetail);

      await productService.updateProduct(partialUpdateBody, sellerUserId);

      // price 키가 아예 없는지 확인하여 의도한 대로 Partial Update 로직이 도는지 검증
      expect(mockProductRepository.updateProduct).toHaveBeenCalledWith(
        txStub,
        productId,
        expect.not.objectContaining({ price: expect.anything() }),
      );
    });
  });

  // 상품 삭제 (deleteProduct)
  describe('deleteProduct', () => {
    it('판매자가 본인 상품 삭제 성공', async () => {
      // 1. 준비
      mockProductRepository.findProductWithStore.mockResolvedValue(mockProductDetail);
      mockProductRepository.delete.mockResolvedValue(mockProductDetail); // 삭제 성공 가정

      // 2. 실행
      await productService.deleteProduct(productId, { id: sellerUserId, type: UserType.SELLER });

      // 3. 검증
      expect(mockProductRepository.findProductWithStore).toHaveBeenCalledWith(productId);
      expect(mockProductRepository.delete).toHaveBeenCalledWith(productId);
    });

    it('상품이 존재하지 않으면 404 에러 발생', async () => {
      // 1. 준비
      mockProductRepository.findProductWithStore.mockResolvedValue(null);

      // 2. 실행 및 검증
      await expect(
        productService.deleteProduct(productId, { id: sellerUserId, type: UserType.SELLER }),
      ).rejects.toThrow(new AppError(404, '존재하지 않는 상품입니다.'));
      expect(mockProductRepository.delete).not.toHaveBeenCalled();
    });

    it('구매자가 상품 삭제 시도 시 403 에러 발생', async () => {
      // 1. 준비
      mockProductRepository.findProductWithStore.mockResolvedValue(mockProductDetail);

      // 2. 실행 및 검증
      await expect(
        productService.deleteProduct(productId, { id: buyerUserId, type: UserType.BUYER }),
      ).rejects.toThrow(new AppError(403, '상품을 삭제할 권한이 없습니다.'));
      expect(mockProductRepository.delete).not.toHaveBeenCalled();
    });

    it('본인 스토어 상품이 아니면 403 에러 발생', async () => {
      // 1. 준비 (다른 스토어 ID를 가진 상품)
      const anotherStoreProduct = {
        ...mockProductDetail,
        store: { ...mockStore, userId: 'another-seller' },
      };
      mockProductRepository.findProductWithStore.mockResolvedValue(anotherStoreProduct);

      // 2. 실행 및 검증
      await expect(
        productService.deleteProduct(productId, { id: sellerUserId, type: UserType.SELLER }),
      ).rejects.toThrow(new AppError(403, '본인 스토어의 상품만 삭제할 수 있습니다.'));
      expect(mockProductRepository.delete).not.toHaveBeenCalled();
    });
  });

  // 상품 문의 (Inquiry) 생성/조회
  describe('createProductInquiry', () => {
    const inquiryBody = {
      title: '새 문의',
      content: '문의드립니다.',
      isSecret: true,
    };
    it('구매자가 상품에 대한 문의 생성 성공', async () => {
      // 1. 준비
      mockProductRepository.findProductWithStore.mockResolvedValue(mockProductDetail);
      mockProductRepository.createInquiry.mockResolvedValue(mockInquiry);

      // 2. 실행
      const result = await productService.createProductInquiry(buyerUserId, productId, inquiryBody);

      // 3. 검증
      expect(mockProductRepository.findProductWithStore).toHaveBeenCalledWith(productId);
      expect(mockProductRepository.createInquiry).toHaveBeenCalledWith(
        buyerUserId,
        productId,
        inquiryBody,
      );
      expect(result).toEqual(mockInquiry);
    });

    it('상품이 존재하지 않으면 404 에러 발생', async () => {
      // 1. 준비
      mockProductRepository.findProductWithStore.mockResolvedValue(null);

      // 2. 실행 및 검증
      await expect(
        productService.createProductInquiry(buyerUserId, productId, inquiryBody),
      ).rejects.toThrow(new AppError(404, '존재하지 않는 상품입니다.'));
      expect(mockProductRepository.createInquiry).not.toHaveBeenCalled();
    });
  });

  describe('getProductInquiries', () => {
    const mockInquiryList: InquiryWithRelations[] = [
      {
        ...mockInquiry,
        status: InquiryStatus.WaitingAnswer,
        user: { name: '구매자' },
        reply: null,
      },
      {
        ...mockInquiry,
        id: 'inq-2',
        isSecret: true,
        status: InquiryStatus.CompletedAnswer,
        user: { name: '구매자2' },
        reply: null,
      },
    ];

    it('상품 문의 목록 조회 성공 (비로그인/일반 구매자)', async () => {
      // 1. 준비
      mockProductRepository.findProductWithStore.mockResolvedValue(mockProductDetail);
      mockProductRepository.findInquiriesByProductId.mockResolvedValue(mockInquiryList);

      // 2. 실행
      const result = await productService.getProductInquiries(productId); // userId 없음

      // 3. 검증: isStoreOwner = false 로 호출되는지 확인
      expect(mockProductRepository.findInquiriesByProductId).toHaveBeenCalledWith(
        productId,
        undefined, // userId
        false, // isStoreOwner
      );
      expect(result).toEqual(mockInquiryList);
    });

    it('스토어 오너가 상품 문의 목록 조회 성공 (isStoreOwner = true)', async () => {
      // 1. 준비
      mockProductRepository.findProductWithStore.mockResolvedValue(mockProductDetail);
      mockProductRepository.findInquiriesByProductId.mockResolvedValue(mockInquiryList);

      // 2. 실행
      const result = await productService.getProductInquiries(productId, sellerUserId); // store owner Id

      // 3. 검증: isStoreOwner = true 로 호출되는지 확인
      expect(mockProductRepository.findInquiriesByProductId).toHaveBeenCalledWith(
        productId,
        sellerUserId,
        true, // isStoreOwner
      );
      expect(result).toEqual(mockInquiryList);
    });

    it('상품이 존재하지 않으면 404 에러 발생', async () => {
      // 1. 준비
      mockProductRepository.findProductWithStore.mockResolvedValue(null);

      // 2. 실행 및 검증
      await expect(productService.getProductInquiries(productId)).rejects.toThrow(
        new AppError(404, '존재하지 않는 상품입니다.'),
      );
      expect(mockProductRepository.findInquiriesByProductId).not.toHaveBeenCalled();
    });
  });

  // 상세 조회 (getProductDetail)
  describe('getProductDetail', () => {
    it('상품 상세 조회 성공', async () => {
      // 1. 준비
      mockProductRepository.findProductDetail.mockResolvedValue(mockProductDetail);

      // 2. 실행
      const result = await productService.getProductDetail(productId);

      // 3. 검증
      expect(mockProductRepository.findProductDetail).toHaveBeenCalledWith(productId);
      expect(result).toEqual(mockProductDetail);
    });

    it('상품을 찾을 수 없으면 404 에러 발생', async () => {
      // 1. 준비
      mockProductRepository.findProductDetail.mockResolvedValue(null);

      // 2. 실행 및 검증
      await expect(productService.getProductDetail(productId)).rejects.toThrow(
        new AppError(404, '상품을 찾을 수 없습니다.'),
      );
    });
  });

  // 상품 목록 조회 (getProducts)
  describe('getProducts', () => {
    const mockProductList = [
      { ...mockProductDetail, id: 'p1' },
      { ...mockProductDetail, id: 'p2' },
    ];
    const mockTotalCount = 100;

    const baseQuery: GetProductsQuery = {
      page: 1,
      pageSize: 10,
      sort: 'recent',
      priceMin: undefined,
      priceMax: undefined,
      search: undefined,
      categoryName: undefined,
      favoriteStore: undefined,
      size: undefined,
    };

    it('기본 조건으로 상품 목록 조회 성공', async () => {
      // 1. 준비
      (prisma.product.findMany as jest.Mock).mockResolvedValue(mockProductList);
      (prisma.product.count as jest.Mock).mockResolvedValue(mockTotalCount);

      // 2. 실행
      const result = await productService.getProducts(baseQuery);

      // 3. 검증
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {}, // 기본 쿼리: where 없음
          orderBy: { createdAt: 'desc' },
          skip: 0,
          take: 10,
        }),
      );
      expect(prisma.product.count).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
      expect(result.list).toEqual(mockProductList); // Mapper 모킹으로 원본 데이터 반환
      expect(result.totalCount).toBe(mockTotalCount);
    });

    it('검색(search) 조건 적용 확인', async () => {
      // 1. 준비
      const searchQuery = { ...baseQuery, search: '나이키' };
      (prisma.product.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.product.count as jest.Mock).mockResolvedValue(0);

      // 2. 실행
      await productService.getProducts(searchQuery);

      // 3. 검증
      const expectedWhere = {
        OR: [
          { name: { contains: '나이키', mode: 'insensitive' } },
          { store: { name: { contains: '나이키', mode: 'insensitive' } } },
        ],
      };
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expectedWhere }),
      );
      expect(prisma.product.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expectedWhere }),
      );
    });

    it('가격 범위(priceMin, priceMax) 조건 적용 확인', async () => {
      // 1. 준비
      const priceQuery = { ...baseQuery, priceMin: 1000, priceMax: 50000 };
      (prisma.product.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.product.count as jest.Mock).mockResolvedValue(0);

      // 2. 실행
      await productService.getProducts(priceQuery);

      // 3. 검증
      const expectedWhere = { price: { gte: 1000, lte: 50000 } };
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expectedWhere }),
      );
    });

    it('카테고리(categoryName) 조건 적용 확인', async () => {
      // 1. 준비
      const categoryQuery = { ...baseQuery, categoryName: 'TOP' };
      (prisma.product.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.product.count as jest.Mock).mockResolvedValue(0);

      // 2. 실행
      await productService.getProducts(categoryQuery);

      // 3. 검증
      const expectedWhere = { categoryName: CategoryName.TOP };
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expectedWhere }),
      );
    });

    it('정렬(sort) 조건 적용 확인 - mostReviewed', async () => {
      // 1. 준비
      const sortQuery = { ...baseQuery, sort: 'mostReviewed' as const };
      (prisma.product.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.product.count as jest.Mock).mockResolvedValue(0);

      // 2. 실행
      await productService.getProducts(sortQuery);

      // 3. 검증
      const expectedOrderBy = { reviews: { _count: 'desc' } };
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: expectedOrderBy }),
      );
    });
  });
});
