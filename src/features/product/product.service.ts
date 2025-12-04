import prisma from '../../lib/prisma';
import type { CreateProductBody } from './product.schema';
import type { DetailProductResponse, UpdateProductDto } from './product.dto';
import { Prisma } from '@prisma/client';
import type { DetailInquiry, CategoryResponse, StocksResponse } from './product.dto';
import { ProductRepository } from './product.repository';
import { ProductWithDetailRelations } from './product.type';
import { AppError } from '../../shared/middleware/error-handler';
import { UserType } from '../../shared/types/auth';

export class ProductService {
  constructor(private readonly productRepository = new ProductRepository()) {}

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
      const category = await this.productRepository.upsertCategoryByName(tx, categoryName);

      const product = await this.productRepository.createProduct(tx, {
        storeId: store.id,
        name,
        price,
        content,
        image,
        discountRate,
        discountStartTime,
        discountEndTime,
        categoryId: category.id,
      });

      await this.productRepository.createStocks(tx, product.id, stocks);

      return product.id;
    });

    const product = await this.productRepository.findProductDetail(productId);
    if (!product) {
      throw new AppError(500, '상품 상세 정보를 조회할 수 없습니다.');
    }

    return this.mapToDetailDto(product);
  }

  async getProductDetail(productId: string): Promise<DetailProductResponse> {
    const product = await this.productRepository.findProductDetail(productId);

    if (!product) {
      throw new AppError(404, '상품을 찾을 수 없습니다.');
    }
    return this.mapToDetailDto(product);
  }

  private mapToDetailDto(product: ProductWithDetailRelations): DetailProductResponse {
    const discountPrice =
      product.discountRate != null
        ? Math.floor((product.price * (100 - product.discountRate)) / 100)
        : product.price;

    const rateCounts: [number, number, number, number, number] = [0, 0, 0, 0, 0];
    let sumScore = 0;

    const reviews = product.reviews ?? [];
    const inquiriesRaw = product.inquiries ?? [];
    const categoriesRaw = product.categories ?? [];
    const stocksRaw = product.stocks ?? [];

    for (const r of reviews) {
      const idx = r.rating - 1;
      if (idx >= 0 && idx < 5) {
        const current = rateCounts[idx] ?? 0;
        rateCounts[idx] = current + 1;
        sumScore += r.rating;
      }
    }

    const reviewsCount = reviews.length;
    const reviewsRating = reviewsCount === 0 ? 0 : Number((sumScore / reviewsCount).toFixed(1));

    if (!product.store) {
      throw new AppError(500, '상품에 연결된 스토어가 없습니다.');
    }

    const inquiries: DetailInquiry[] = inquiriesRaw.map((inq) => ({
      id: inq.id,
      title: inq.title,
      content: inq.content,
      status: inq.status,
      isSecret: inq.isSecret,
      createdAt: inq.createdAt.toISOString(),
      updatedAt: inq.updatedAt.toISOString(),
      reply:
        inq.reply && inq.reply.user
          ? {
              id: inq.reply.id,
              content: inq.reply.content,
              createdAt: inq.reply.createdAt.toISOString(),
              updatedAt: inq.reply.updatedAt.toISOString(),
              user: {
                id: inq.reply.user.id,
                name: inq.reply.user.name,
              },
            }
          : undefined,
    }));

    const category: CategoryResponse[] = categoriesRaw.map((pc) => ({
      id: pc.category.id,
      name: pc.category.name,
    }));

    const stocks: StocksResponse[] = stocksRaw.map((s) => ({
      id: s.id,
      productId: product.id,
      quantity: s.quantity,
      size: s.size
        ? {
            id: s.size.id,
            name: s.size.ko,
          }
        : undefined,
    }));

    return {
      id: product.id,
      name: product.name,
      image: product.image ?? '',
      content: product.content ?? '',
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      reviewsRating,
      storeId: product.store.id,
      storeName: product.store.name,
      price: product.price,
      discountPrice,
      discountRate: product.discountRate ?? 0,
      discountStartTime: product.discountStartTime?.toISOString(),
      discountEndTime: product.discountEndTime?.toISOString(),
      reviewsCount,
      reviews: [
        {
          rate1Length: rateCounts[0],
          rate2Length: rateCounts[1],
          rate3Length: rateCounts[2],
          rate4Length: rateCounts[3],
          rate5Length: rateCounts[4],
          sumScore,
        },
      ],
      inquiries,
      category,
      stocks,
    };
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
      let categoryNested: Prisma.ProductUpdateInput['categories'] | undefined;

      if (body.categoryName) {
        const category = await this.productRepository.upsertCategoryByName(tx, body.categoryName);

        categoryNested = {
          deleteMany: {},
          create: [{ category: { connect: { id: category.id } } }],
        };
      }

      const updateData: Prisma.ProductUpdateInput = {
        ...('name' in rest ? { name: rest.name } : {}),
        ...('price' in rest ? { price: rest.price } : {}),
        ...('content' in rest ? { content: rest.content } : {}),
        ...('image' in rest ? { image: rest.image } : {}),
        ...('discountRate' in rest ? { discountRate: rest.discountRate } : {}),
        ...('discountStartTime' in rest ? { discountStartTime: rest.discountStartTime } : {}),
        ...('discountEndTime' in rest ? { discountEndTime: rest.discountEndTime } : {}),
        ...('isSoldOut' in rest ? { isSoldOut: rest.isSoldOut } : {}),
        ...(categoryNested ? { categories: categoryNested } : {}),
      };

      await this.productRepository.updateProduct(tx, productId, updateData);

      await this.productRepository.deleteStocksByProductId(tx, productId);
      await this.productRepository.createStocks(tx, productId, stocks);

      return productId;
    });

    const product = await this.productRepository.findProductDetail(updatedProductId);
    if (!product) {
      throw new AppError(500, '상품 상세 정보를 조회할 수 없습니다');
    }

    return this.mapToDetailDto(product);
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

    // 비즈니스 룰 (주문 존재 시 삭제 금지, 등) 필요하면 여기 추가

    await this.productRepository.delete(productId);
  }
}
