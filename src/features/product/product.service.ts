import prisma from '../../lib/prisma'; // 트랜잭션 처리를 위해 필요
import { CategoryName, Prisma } from '@prisma/client';
import { AppError } from '../../shared/middleware/error-handler';
import { UserType } from '../../shared/types/auth';
import { ProductRepository } from './product.repository';
import { ProductMapper } from './product.mapper'; // [New] 매퍼 임포트

import type { CreateProductBody, GetProductsQuery } from './product.schema';
import type {
  DetailProductResponse,
  ProductListResponse,
  UpdateProductDto,
  InquiryResponse,
  InquiriesResponse, // [New] 문의 응답 타입
} from './product.dto';
import { productListInclude } from './product.type';

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

  /* ===== 문의(Inquiry) ===== */

  /** 문의 생성 */
  async createProductInquiry(
    userId: string,
    productId: string,
    body: { title: string; content: string; isSecret: boolean },
  ): Promise<InquiryResponse> {
    const product = await this.productRepository.findProductWithStore(productId);
    if (!product) {
      throw new AppError(404, '존재하지 않는 상품입니다.');
    }

    const newInquiry = await this.productRepository.createInquiry(userId, productId, body);

    return ProductMapper.toInquiryDto(newInquiry);
  }

  /** 문의 조회 */
  async getProductInquiries(productId: string, userId?: string): Promise<InquiriesResponse[]> {
    const product = await this.productRepository.findProductWithStore(productId);

    if (!product) {
      throw new AppError(404, '존재하지 않는 상품입니다.');
    }

    const isStoreOwner = !!(userId && product.store && product.store.userId === userId);

    const inquiries = await this.productRepository.findInquiriesByProductId(
      productId,
      userId,
      isStoreOwner,
    );

    return ProductMapper.toInquiryListDto(inquiries);
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

    const list = products.map((p) => ProductMapper.toListDto(p));

    return {
      list,
      totalCount,
    };
  }

  /* ===== 조회용 내부 헬퍼 (쿼리 빌더 & 상세 조회 공통) ===== */

  /** 상세용: 상품을 조회하고 없으면 404, 있으면 DTO로 변환 */
  private async getProductDetailOrThrow(productId: string): Promise<DetailProductResponse> {
    const product = await this.productRepository.findProductDetail(productId);

    if (!product) {
      throw new AppError(404, '상품을 찾을 수 없습니다.');
    }

    return ProductMapper.toDetailDto(product);
  }

  private buildWhere(query: GetProductsQuery): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {};

    if (query.search) {
      where.OR = [
        {
          name: { contains: query.search, mode: 'insensitive' },
        },
        {
          store: { name: { contains: query.search, mode: 'insensitive' } },
        },
      ];
    }

    if (query.priceMin != null || query.priceMax != null) {
      where.price = {};
      if (query.priceMin != null) where.price.gte = query.priceMin;
      if (query.priceMax != null) where.price.lte = query.priceMax;
    }

    if (query.categoryName) {
      where.categoryName = query.categoryName.toUpperCase() as CategoryName;
    }

    if (query.favoriteStore) {
      where.storeId = query.favoriteStore;
    }

    if (query.size) {
      where.stocks = {
        some: {
          size: { is: { ko: query.size } },
        },
      };
    }

    return where;
  }

  private buildOrderBy(sort?: GetProductsQuery['sort']): Prisma.ProductOrderByWithRelationInput {
    switch (sort) {
      case 'mostReviewed':
        return { reviews: { _count: 'desc' } };
      case 'recent':
        return { createdAt: 'desc' };
      case 'lowPrice':
        return { price: 'asc' };
      case 'highPrice':
        return { price: 'desc' };
      case 'highRating':
        return { createdAt: 'desc' }; // TODO: 별점순 정렬 구현 필요
      case 'salesRanking':
        return { createdAt: 'desc' }; // TODO: 판매량순 정렬 구현 필요
      default:
        return { createdAt: 'desc' };
    }
  }
}
