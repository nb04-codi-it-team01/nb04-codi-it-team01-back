import prisma from '../../lib/prisma';
import type { CreateProductBody, GetProductsQuery } from './product.schema';
import type {
  DetailProductResponse,
  ProductListDto,
  ProductListResponse,
  ReviewDto,
  UpdateProductDto,
  DetailInquiry,
  CategoryResponse,
  StocksResponse,
} from './product.dto';
import { CategoryName, Prisma } from '@prisma/client';
import { ProductRepository } from './product.repository';
import { ProductWithDetailRelations } from './product.type';
import { AppError } from '../../shared/middleware/error-handler';
import { UserType } from '../../shared/types/auth';

/* ---------- 리스트 조회용 include & 타입 ---------- */

const productListInclude = {
  store: true,
  _count: {
    select: {
      reviews: true,
    },
  },
  reviews: {
    select: {
      rating: true,
    },
  },
  orderItems: {
    select: {
      quantity: true,
    },
  },
} satisfies Prisma.ProductInclude;

type ProductWithListRelations = Prisma.ProductGetPayload<{
  include: typeof productListInclude;
}>;

/* ---------- 서비스 ---------- */

export class ProductService {
  constructor(private readonly productRepository = new ProductRepository()) {}

  /* ===== 생성 / 수정 / 삭제 ===== */

  async createProduct(
    body: CreateProductBody,
    sellerUserId: string,
  ): Promise<DetailProductResponse> {
    const {
      name,
      price,
      content,
      image,
      discountRate,
      discountStartTime,
      discountEndTime,
      categoryName,
      stocks,
    } = body;

    const store = await this.productRepository.findStoreByUserId(sellerUserId);
    if (!store) {
      throw new AppError(404, '스토어가 존재하지 않습니다.');
    }

    const productId = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const product = await this.productRepository.createProduct(tx, {
        storeId: store.id,
        name,
        price,
        content,
        image,
        discountRate,
        discountStartTime,
        discountEndTime,
        categoryName: categoryName as CategoryName,
      });

      await this.productRepository.createStocks(tx, product.id, stocks);

      return product.id;
    });

    // 생성 후 상세 조회 공통 헬퍼 사용
    return this.getProductDetailOrThrow(productId);
  }

  async updateProduct(
    body: UpdateProductDto,
    sellerUserId: string,
  ): Promise<DetailProductResponse> {
    const { id: productId, stocks, ...rest } = body;

    const store = await this.productRepository.findStoreByUserId(sellerUserId);
    if (!store) {
      throw new AppError(404, '스토어가 존재하지 않습니다.');
    }

    const existing = await this.productRepository.findProductWithStore(productId);
    if (!existing) {
      throw new AppError(404, '상품을 찾을 수 없습니다');
    }

    if (existing.storeId !== store.id) {
      throw new AppError(403, '본인 스토어의 상품만 수정할 수 있습니다');
    }

    const updatedProductId = await prisma.$transaction(async (tx) => {
      const updateData: Prisma.ProductUpdateInput = {
        ...('name' in rest ? { name: rest.name } : {}),
        ...('price' in rest ? { price: rest.price } : {}),
        ...('content' in rest ? { content: rest.content } : {}),
        ...('image' in rest ? { image: rest.image } : {}),
        ...('discountRate' in rest ? { discountRate: rest.discountRate } : {}),
        ...('discountStartTime' in rest ? { discountStartTime: rest.discountStartTime } : {}),
        ...('discountEndTime' in rest ? { discountEndTime: rest.discountEndTime } : {}),
        ...('isSoldOut' in rest ? { isSoldOut: rest.isSoldOut } : {}),
        ...('categoryName' in rest && rest.categoryName
          ? { categoryName: rest.categoryName as CategoryName }
          : {}),
      };

      await this.productRepository.updateProduct(tx, productId, updateData);

      await this.productRepository.deleteStocksByProductId(tx, productId);
      await this.productRepository.createStocks(tx, productId, stocks);

      return productId;
    });

    return this.getProductDetailOrThrow(updatedProductId);
  }

  async deleteProduct(productId: string, actorUser: { id: string; type: UserType }) {
    const product = await this.productRepository.findProductWithStore(productId);

    if (!product) {
      throw new AppError(404, '존재하지 않는 상품입니다.');
    }

    if (actorUser.type !== 'SELLER') {
      throw new AppError(403, '상품을 삭제할 권한이 없습니다.');
    }

    if (!product.store) {
      throw new AppError(404, '스토어가 존재하지 않습니다');
    }

    if (product.store.userId !== actorUser.id) {
      throw new AppError(403, '본인 스토어의 상품만 삭제할 수 있습니다.');
    }

    await this.productRepository.delete(productId);
  }

  /* ===== 조회 ===== */

  /** 단일 상품 상세 조회 (컨트롤러에서 직접 사용) */
  async getProductDetail(productId: string): Promise<DetailProductResponse> {
    return this.getProductDetailOrThrow(productId);
  }

  /** 상품 목록 조회 */
  async getProducts(query: GetProductsQuery): Promise<ProductListResponse> {
    const where = this.buildWhere(query);
    const orderBy = this.buildOrderBy(query.sort);

    const skip = (query.page - 1) * query.pageSize;
    const take = query.pageSize;

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take,
        include: productListInclude,
      }),
      prisma.product.count({ where }),
    ]);

    const list = products.map((p) => this.toProductListDto(p));

    return {
      list,
      totalCount,
    };
  }

  /* ===== 조회용 내부 헬퍼 ===== */

  /** 상세용: 상품을 조회하고 없으면 404, 있으면 DTO로 변환 */
  private async getProductDetailOrThrow(productId: string): Promise<DetailProductResponse> {
    const product = await this.productRepository.findProductDetail(productId);

    if (!product) {
      throw new AppError(404, '상품을 찾을 수 없습니다.');
    }

    return this.mapToDetailResponse(product);
  }

  private buildWhere(query: GetProductsQuery): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {};

    if (query.search) {
      where.OR = [
        {
          name: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          store: {
            name: {
              contains: query.search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    if (query.priceMin != null || query.priceMax != null) {
      where.price = {};
      if (query.priceMin != null) {
        where.price.gte = query.priceMin;
      }
      if (query.priceMax != null) {
        where.price.lte = query.priceMax;
      }
    }

    if (query.categoryName) {
      where.categoryName = query.categoryName as CategoryName;
    }

    if (query.favoriteStore) {
      where.storeId = query.favoriteStore;
    }

    if (query.size) {
      where.stocks = {
        some: {
          size: {
            is: {
              ko: query.size, // Size.ko 기준 필터
            },
          },
        },
      };
    }

    return where;
  }

  private buildOrderBy(sort?: GetProductsQuery['sort']): Prisma.ProductOrderByWithRelationInput {
    switch (sort) {
      case 'mostReviewed':
        return {
          reviews: {
            _count: 'desc',
          },
        };
      case 'recent':
        return {
          createdAt: 'desc',
        };
      case 'lowPrice':
        return {
          price: 'asc',
        };
      case 'highPrice':
        return {
          price: 'desc',
        };
      case 'highRating':
        return {
          createdAt: 'desc',
        }; // TODO: 평균 평점 기준 정렬로 변경 고려
      case 'salesRanking':
        return {
          createdAt: 'desc',
        }; // TODO: 매출 기준 정렬로 변경 고려
      default:
        return {
          createdAt: 'desc',
        };
    }
  }

  /* ---------- 리스트 DTO 변환 ---------- */

  private toProductListDto(p: ProductWithListRelations): ProductListDto {
    const now = new Date();

    if (!p.storeId || !p.store) {
      throw new AppError(500, '스토어 정보가 없는 상품입니다.');
    }

    const hasDiscountRange =
      p.discountStartTime != null && p.discountEndTime != null && p.discountRate != null;

    const isInDiscountRange =
      hasDiscountRange && p.discountStartTime! <= now && now <= p.discountEndTime!;

    const discountRate = p.discountRate ?? 0;

    const discountPrice = isInDiscountRange
      ? Math.round(p.price * ((100 - discountRate) / 100))
      : p.price;

    const reviewsCount = p._count.reviews;
    const reviewsRating =
      p.reviews.length > 0 ? p.reviews.reduce((sum, r) => sum + r.rating, 0) / p.reviews.length : 0;

    const sales = p.orderItems.reduce((sum, item) => sum + item.quantity, 0);

    return {
      id: p.id,
      storeId: p.storeId,
      storeName: p.store.name,
      name: p.name,
      image: p.image ?? '',
      price: p.price,
      discountPrice,
      discountRate,
      discountStartTime: p.discountStartTime?.toISOString(),
      discountEndTime: p.discountEndTime?.toISOString(),
      reviewsCount,
      reviewsRating,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      sales,
      isSoldOut: p.isSoldOut,
    };
  }

  /* ---------- 상세 DTO 변환 (한 군데로 통합) ---------- */

  private mapToDetailResponse(p: ProductWithDetailRelations): DetailProductResponse {
    if (!p.storeId || !p.store) {
      throw new AppError(500, '스토어 정보가 없는 상품입니다.');
    }

    const now = new Date();

    const hasDiscountRange =
      p.discountStartTime != null && p.discountEndTime != null && p.discountRate != null;

    const isInDiscountRange =
      hasDiscountRange && p.discountStartTime! <= now && now <= p.discountEndTime!;

    const discountRate = p.discountRate ?? 0;

    const discountPrice = isInDiscountRange
      ? Math.round(p.price * ((100 - discountRate) / 100))
      : p.price;

    const { reviewsCount, reviewsRating, sumScore, rateCounts } = this.buildReviewStats(p);

    const inquiries = this.mapInquiries(p);
    const category = this.mapCategories(p);
    const stocks = this.mapStocks(p);

    const reviewSummary: ReviewDto = {
      rate1Length: rateCounts[0] ?? 0,
      rate2Length: rateCounts[1] ?? 0,
      rate3Length: rateCounts[2] ?? 0,
      rate4Length: rateCounts[3] ?? 0,
      rate5Length: rateCounts[4] ?? 0,
      sumScore,
    };

    return {
      id: p.id,
      name: p.name,
      image: p.image ?? '',
      content: p.content ?? '',
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      reviewsRating,
      storeId: p.storeId,
      storeName: p.store.name,
      price: p.price,
      discountPrice,
      discountRate,
      discountStartTime: p.discountStartTime?.toISOString(),
      discountEndTime: p.discountEndTime?.toISOString(),
      reviewsCount,
      reviews: [reviewSummary],
      inquiries,
      category,
      stocks,
    };
  }

  /* ---------- 상세용 서브 매퍼들 ---------- */

  private buildReviewStats(p: ProductWithDetailRelations): {
    reviewsCount: number;
    reviewsRating: number;
    sumScore: number;
    rateCounts: number[];
  } {
    const reviews = p.reviews ?? [];
    const rateCounts = [0, 0, 0, 0, 0]; // number[]
    let sumScore = 0;

    for (const r of reviews) {
      const idx = r.rating - 1;
      if (idx >= 0 && idx < rateCounts.length) {
        rateCounts[idx]! += 1;
        sumScore += r.rating;
      }
    }

    const reviewsCount = reviews.length;
    const reviewsRating = reviewsCount === 0 ? 0 : Number((sumScore / reviewsCount).toFixed(1));

    return { reviewsCount, reviewsRating, sumScore, rateCounts };
  }

  private mapInquiries(p: ProductWithDetailRelations): DetailInquiry[] {
    const inquiries = p.inquiries ?? [];

    return inquiries.map((inq) => {
      let reply: DetailInquiry['reply'];

      if (inq.reply) {
        const replyUser = inq.reply.user;

        if (replyUser) {
          reply = {
            id: inq.reply.id,
            content: inq.reply.content,
            createdAt: inq.reply.createdAt.toISOString(),
            updatedAt: inq.reply.updatedAt.toISOString(),
            user: {
              id: replyUser.id,
              name: replyUser.name,
            },
          };
        }
      }

      return {
        id: inq.id,
        title: inq.title,
        content: inq.content,
        status: inq.status,
        isSecret: inq.isSecret,
        createdAt: inq.createdAt.toISOString(),
        updatedAt: inq.updatedAt.toISOString(),
        reply,
      };
    });
  }

  private mapCategories(p: ProductWithDetailRelations): CategoryResponse[] {
    return [{ id: p.categoryName, name: p.categoryName }];
  }

  private mapStocks(p: ProductWithDetailRelations): StocksResponse[] {
    const stocks = p.stocks ?? [];

    return stocks.map((s) => {
      if (!s.productId) {
        throw new AppError(500, '상품 정보가 없는 재고입니다.');
      }

      const stock: StocksResponse = {
        id: s.id,
        productId: s.productId,
        quantity: s.quantity,
      };

      if (s.size) {
        stock.size = {
          id: s.size.id,
          name: s.size.ko,
        };
      }

      return stock;
    });
  }
}
