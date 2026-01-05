import { ProductService } from '../../../src/features/product/product.service';
import { ProductRepository } from '../../../src/features/product/product.repository';
import { AppError } from '../../../src/shared/middleware/error-handler';
import { UserType, CategoryName, Store, InquiryStatus, Prisma, User } from '@prisma/client';
import prisma from '../../../src/lib/prisma';
import type {
  CreateProductBody,
  GetProductsQuery,
} from '../../../src/features/product/product.schema';
import type { UpdateProductDto } from '../../../src/features/product/product.dto';
import { ProductWithDetailRelations } from '../../../src/features/product/product.type';
import { NotificationService } from '../../../src/features/notification/notification.service';

// 1. 의존성 모킹
jest.mock('../../../src/features/product/product.repository');
jest.mock('../../../src/features/notification/notification.service');
jest.mock('../../../src/features/product/product.mapper', () => ({
  ProductMapper: {
    toDetailDto: jest.fn((v) => v),
    toInquiryDto: jest.fn((v) => v),
    toInquiryListDto: jest.fn((list, totalCount) => ({ list, totalCount })),
    toListDto: jest.fn((v) => v),
  },
}));

// 2. Prisma Transaction 모킹
const txStub = { __tx: true } as unknown as Prisma.TransactionClient;
jest.mock('../../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(async (callback) => callback(txStub)),
    product: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('ProductService', () => {
  let productService: ProductService;
  let mockProductRepository: jest.Mocked<ProductRepository>;
  let mockNotificationService: jest.Mocked<NotificationService>;

  // 상수 및 Mock 데이터 정의
  const sellerUserId = 'seller-user-123';
  const buyerUserId = 'buyer-user-456';
  const productId = 'prod-123';

  // User 타입 명시
  const mockUser: User = {
    id: buyerUserId,
    email: 'buyer@test.com',
    password: 'hashed_password', // 실제 로직에선 안 쓰지만 타입 맞추기용
    name: '구매자',
    type: UserType.BUYER,
    points: 0,
    totalAmount: 0,
    gradeId: null,
    image: 'user_image.jpg',
    refreshToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Store 타입 명시
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

  // Relation이 포함된 Product 타입 명시
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
    reviewCount: 0,
    salesCount: 0,
    avgRating: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInquiry = {
    id: 'inquiry-1',
    productId,
    userId: buyerUserId,
    storeId: mockStore.id,
    title: '문의 제목',
    content: '문의 내용',
    isSecret: false,
    status: InquiryStatus.WaitingAnswer,
    reply: null,
    user: mockUser,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Repository Mock 인스턴스 생성
    mockProductRepository = new ProductRepository() as jest.Mocked<ProductRepository>;

    // NotificationService Mock 인스턴스 생성
    mockNotificationService = {
      createNotification: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<NotificationService>;

    // Service 주입
    productService = new ProductService(mockProductRepository, mockNotificationService);
  });

  /* -------------------------------------------------------------------------- */
  /* createProduct */
  /* -------------------------------------------------------------------------- */
  describe('createProduct', () => {
    const createBody: CreateProductBody = {
      name: '새 상품',
      price: 20000,
      categoryName: 'TOP',
      stocks: [{ sizeId: 1, quantity: 10 }],
      content: '새 상품 내용',
      image: 'new_image.jpg',
      discountRate: 0,
    };

    it('스토어 오너가 상품 생성 성공 (트랜잭션 포함)', async () => {
      // 1. 준비
      mockProductRepository.findStoreByUserId.mockResolvedValue(mockStore);
      mockProductRepository.createProduct.mockResolvedValue(mockProductDetail);
      mockProductRepository.findProductDetail.mockResolvedValue(mockProductDetail);

      // 2. 실행
      const result = await productService.createProduct(createBody, sellerUserId);

      // 3. 검증
      expect(mockProductRepository.findStoreByUserId).toHaveBeenCalledWith(sellerUserId);
      expect(prisma.$transaction).toHaveBeenCalled();

      // 트랜잭션 내 Repository 호출 검증
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
        mockProductDetail.id, // createProduct가 반환한 ID
        createBody.stocks,
      );
      expect(result).toEqual(mockProductDetail);
    });

    it('스토어가 존재하지 않으면 404 에러 발생', async () => {
      mockProductRepository.findStoreByUserId.mockResolvedValue(null);

      await expect(productService.createProduct(createBody, sellerUserId)).rejects.toThrow(
        new AppError(404, '스토어가 존재하지 않습니다.'),
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  /* -------------------------------------------------------------------------- */
  /* updateProduct */
  /* -------------------------------------------------------------------------- */
  describe('updateProduct', () => {
    const updateBody: UpdateProductDto = {
      id: productId,
      name: '변경된 상품명',
      stocks: [{ sizeId: 1, quantity: 15 }],
    };

    it('본인 스토어의 상품 수정 성공 (트랜잭션 및 스톡 갱신)', async () => {
      mockProductRepository.findStoreByUserId.mockResolvedValue(mockStore);
      mockProductRepository.findProductWithStore.mockResolvedValue(mockProductDetail);
      mockProductRepository.findProductDetail.mockResolvedValue({
        ...mockProductDetail,
        name: '변경된 상품명',
      });

      const result = await productService.updateProduct(updateBody, sellerUserId);

      expect(prisma.$transaction).toHaveBeenCalled();

      // updateProduct 호출 검증 (Prisma.ProductUpdateInput 구조 확인)
      expect(mockProductRepository.updateProduct).toHaveBeenCalledWith(
        txStub,
        productId,
        expect.objectContaining({ name: '변경된 상품명' }),
      );

      // 스톡 삭제 및 재생성 검증
      expect(mockProductRepository.deleteStocksByProductId).toHaveBeenCalledWith(txStub, productId);
      expect(mockProductRepository.createStocks).toHaveBeenCalledWith(
        txStub,
        productId,
        updateBody.stocks,
      );

      expect(result.name).toBe('변경된 상품명');
    });

    it('본인 스토어 상품이 아니면 403 에러', async () => {
      const anotherStoreProduct = {
        ...mockProductDetail,
        storeId: 'other-store',
        store: { ...mockStore, id: 'other-store' },
      };

      mockProductRepository.findStoreByUserId.mockResolvedValue(mockStore);
      mockProductRepository.findProductWithStore.mockResolvedValue(anotherStoreProduct);

      await expect(productService.updateProduct(updateBody, sellerUserId)).rejects.toThrow(
        new AppError(403, '본인 스토어의 상품만 수정할 수 있습니다'),
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  /* -------------------------------------------------------------------------- */
  /* deleteProduct */
  /* -------------------------------------------------------------------------- */
  describe('deleteProduct', () => {
    it('판매자가 본인 상품 삭제 성공', async () => {
      mockProductRepository.findProductWithStore.mockResolvedValue(mockProductDetail);

      await productService.deleteProduct(productId, { id: sellerUserId, type: UserType.SELLER });

      expect(mockProductRepository.delete).toHaveBeenCalledWith(productId);
    });

    it('구매자(권한 없는 유저)가 삭제 시도 시 403 에러', async () => {
      mockProductRepository.findProductWithStore.mockResolvedValue(mockProductDetail);

      await expect(
        productService.deleteProduct(productId, { id: buyerUserId, type: UserType.BUYER }),
      ).rejects.toThrow(new AppError(403, '본인 스토어의 상품만 삭제할 수 있습니다.'));

      expect(mockProductRepository.delete).not.toHaveBeenCalled();
    });
  });

  /* -------------------------------------------------------------------------- */
  /* createProductInquiry (Updated) */
  /* -------------------------------------------------------------------------- */
  describe('createProductInquiry', () => {
    const inquiryBody = {
      title: '새 문의',
      content: '문의드립니다.',
      isSecret: true,
    };

    it('문의 생성 성공 및 판매자에게 알림 발송', async () => {
      // 1. 준비
      mockProductRepository.findProductWithStore.mockResolvedValue(mockProductDetail);
      mockProductRepository.createInquiry.mockResolvedValue(mockInquiry);

      // 2. 실행
      const result = await productService.createProductInquiry(buyerUserId, productId, inquiryBody);

      // 3. 검증
      expect(mockProductRepository.createInquiry).toHaveBeenCalledWith(
        buyerUserId,
        productId,
        mockStore.id,
        inquiryBody,
      );

      // 알림 서비스 호출 검증
      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
        mockStore.userId, // 수신자: 판매자
        mockProductDetail.name, // 상품명
        'INQUIRY', // 타입
      );

      expect(result).toEqual(mockInquiry);
    });

    it('알림 발송이 실패해도 문의 생성은 성공해야 함 (catch 블록 확인)', async () => {
      mockProductRepository.findProductWithStore.mockResolvedValue(mockProductDetail);
      mockProductRepository.createInquiry.mockResolvedValue(mockInquiry);
      // 알림 서비스가 에러를 던지도록 설정
      mockNotificationService.createNotification.mockRejectedValue(new Error('Alarm Failed'));

      // 에러가 던져지지 않고 정상 리턴되어야 함
      await expect(
        productService.createProductInquiry(buyerUserId, productId, inquiryBody),
      ).resolves.toEqual(mockInquiry);

      expect(mockNotificationService.createNotification).toHaveBeenCalled();
    });
  });

  /* -------------------------------------------------------------------------- */
  /* getProductInquiries */
  /* -------------------------------------------------------------------------- */
  describe('getProductInquiries', () => {
    it('상품 문의 목록 조회 성공', async () => {
      const mockList = [mockInquiry];
      const mockTotal = 1;

      mockProductRepository.findProductWithStore.mockResolvedValue(mockProductDetail);
      mockProductRepository.findInquiriesByProductId.mockResolvedValue({
        list: mockList,
        totalCount: mockTotal,
      });

      const result = await productService.getProductInquiries(productId, undefined);

      expect(mockProductRepository.findInquiriesByProductId).toHaveBeenCalledWith(
        productId,
        undefined,
        false,
        1,
        10,
      );
      expect(result).toEqual({ list: mockList, totalCount: mockTotal });
    });
  });

  /* -------------------------------------------------------------------------- */
  /* getProducts (Updated)*/
  /* -------------------------------------------------------------------------- */
  describe('getProducts', () => {
    const mockProductList = [
      { ...mockProductDetail, id: 'p1' },
      { ...mockProductDetail, id: 'p2' },
    ];
    const mockTotalCount = 100;

    const baseQuery: GetProductsQuery = {
      page: 1,
      pageSize: 10,
      priceMin: undefined,
      priceMax: undefined,
      search: undefined,
      sort: undefined,
      size: undefined,
      favoriteStore: undefined,
      categoryName: undefined,
    };

    it('기본 조건으로 상품 목록 조회 성공', async () => {
      // Prisma Mock
      (prisma.product.findMany as jest.Mock).mockResolvedValue(mockProductList);
      (prisma.product.count as jest.Mock).mockResolvedValue(mockTotalCount);

      const result = await productService.getProducts(baseQuery);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { store: { isNot: null } },
          orderBy: { createdAt: 'desc' },
          skip: 0,
          take: 10,
        }),
      );
      expect(result.list).toEqual(mockProductList);
      expect(result.totalCount).toBe(mockTotalCount);
    });

    it('검색(search) 조건 적용 확인', async () => {
      const searchQuery = { ...baseQuery, search: '나이키' };
      (prisma.product.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.product.count as jest.Mock).mockResolvedValue(0);

      await productService.getProducts(searchQuery);

      const expectedWhere = {
        store: { isNot: null },
        OR: [
          { name: { contains: '나이키', mode: 'insensitive' } },
          { store: { name: { contains: '나이키', mode: 'insensitive' } } },
        ],
      };

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expectedWhere }),
      );
    });

    it('사이즈(size) 필터 적용 확인', async () => {
      const sizeQuery = { ...baseQuery, size: 'XL' };
      (prisma.product.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.product.count as jest.Mock).mockResolvedValue(0);

      await productService.getProducts(sizeQuery);

      // Service의 buildWhere 로직과 일치하는지 확인
      const expectedWhere = {
        store: { isNot: null },
        stocks: {
          some: {
            size: { is: { ko: 'XL' } },
          },
        },
      };

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expectedWhere }),
      );
    });

    it('정렬(sort) 조건 적용 확인 - salesRanking', async () => {
      const sortQuery = { ...baseQuery, sort: 'salesRanking' as const };
      (prisma.product.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.product.count as jest.Mock).mockResolvedValue(0);

      await productService.getProducts(sortQuery);

      const expectedOrderBy = [{ salesCount: 'desc' }, { createdAt: 'desc' }];

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: expectedOrderBy }),
      );
    });
  });
});
