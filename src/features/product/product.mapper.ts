import { Prisma } from '@prisma/client';
import { AppError } from '../../shared/middleware/error-handler';
import type {
  DetailProductResponse,
  ProductListDto,
  DetailInquiry,
  CategoryResponse,
  StocksResponse,
  ReviewDto,
  InquiryResponse,
} from './product.dto';
import type {
  ProductWithDetailRelations,
  ProductWithListRelations,
  InquiryWithReply,
  StockWithSize,
  InquiryWithRelations,
} from './product.type';

export class ProductMapper {
  /**
   * 상품 목록 조회용 DTO 변환
   */
  static toListDto(p: ProductWithListRelations): ProductListDto {
    const now = new Date();

    const storeName = p.store?.name ?? '삭제된 스토어';
    const storeId = p.storeId ?? '';

    const hasDiscountRange =
      p.discountStartTime != null && p.discountEndTime != null && p.discountRate != null;

    const isInDiscountRange =
      hasDiscountRange && p.discountStartTime! <= now && now <= p.discountEndTime!;

    const discountRate = p.discountRate ?? 0;

    const discountPrice = isInDiscountRange
      ? Math.floor(p.price * ((100 - discountRate) / 100))
      : p.price;

    const reviewsCount = p._count.reviews;
    const reviewsRating =
      p.reviews.length > 0
        ? p.reviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) /
          p.reviews.length
        : 0;

    const sales = p.orderItems.reduce(
      (sum: number, item: { quantity: number }) => sum + item.quantity,
      0,
    );

    return {
      id: p.id,
      storeId: storeId,
      storeName: storeName,
      name: p.name,
      image: p.image ?? '',
      price: p.price,
      discountPrice,
      discountRate,
      discountStartTime: p.discountStartTime?.toISOString(),
      discountEndTime: p.discountEndTime?.toISOString(),
      reviewsCount,
      reviewsRating: Number(reviewsRating.toFixed(1)),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      sales,
      isSoldOut: p.isSoldOut,
    };
  }

  /**
   * 상품 상세 조회용 DTO 변환
   */
  static toDetailDto(p: ProductWithDetailRelations): DetailProductResponse {
    const storeName = p.store?.name ?? '삭제된 스토어';
    const storeId = p.storeId ?? '';

    const now = new Date();

    const hasDiscountRange =
      p.discountStartTime != null && p.discountEndTime != null && p.discountRate != null;

    const isInDiscountRange =
      hasDiscountRange && p.discountStartTime! <= now && now <= p.discountEndTime!;

    const discountRate = p.discountRate ?? 0;

    const discountPrice = isInDiscountRange
      ? Math.floor(p.price * ((100 - discountRate) / 100))
      : p.price;

    const { reviewsCount, reviewsRating, sumScore, rateCounts } = this.buildReviewStats(p);

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
      storeId: storeId,
      storeName: storeName,
      price: p.price,
      discountPrice,
      discountRate,
      discountStartTime: p.discountStartTime?.toISOString(),
      discountEndTime: p.discountEndTime?.toISOString(),
      reviewsCount,
      reviews: reviewSummary,
      inquiries: this.toInquiryDetailDtos(p.inquiries ?? []),
      category: this.toCategoryDtos(p),
      stocks: this.toStockDtos(p.stocks ?? []),
    };
  }

  /**
   * 문의 생성 직후 응답용 DTO 변환
   */
  static toInquiryDto(inquiry: Prisma.InquiryGetPayload<object>): InquiryResponse {
    if (!inquiry.userId || !inquiry.productId) {
      throw new AppError(500, '문의 생성 중 필수 정보가 누락되었습니다.');
    }

    return {
      id: inquiry.id,
      userId: inquiry.userId,
      productId: inquiry.productId,
      title: inquiry.title,
      content: inquiry.content,
      status: inquiry.status,
      isSecret: inquiry.isSecret,
      createdAt: inquiry.createdAt.toISOString(),
      updatedAt: inquiry.updatedAt.toISOString(),
    };
  }

  /**
   * 상품 문의 목록 조회용 DTO 변환
   */
  static toInquiryListDto(inquiries: InquiryWithRelations[], totalCount: number) {
    return {
      list: inquiries.map((inq) => {
        let replyResponse;
        if (inq.reply) {
          replyResponse = {
            id: inq.reply.id,
            content: inq.reply.content,
            createdAt: inq.reply.createdAt.toISOString(),
            updatedAt: inq.reply.updatedAt.toISOString(),
            user: {
              name: inq.reply.user?.name ?? '관리자',
            },
          };
        }

        return {
          id: inq.id,
          userId: inq.userId ?? '',
          productId: inq.productId ?? '',
          title: inq.title,
          content: inq.content,
          status: inq.status,
          isSecret: inq.isSecret,
          createdAt: inq.createdAt.toISOString(),
          updatedAt: inq.updatedAt.toISOString(),
          user: {
            name: inq.user?.name ?? '알 수 없음',
          },
          reply: replyResponse,
        };
      }),
      totalCount: totalCount,
    };
  }

  /* =========================================
     Private Helper Methods
     ========================================= */

  private static buildReviewStats(p: ProductWithDetailRelations) {
    const reviews = p.reviews ?? [];
    const rateCounts = [0, 0, 0, 0, 0];
    let totalSum = 0;

    for (const r of reviews) {
      const idx = r.rating - 1;
      if (idx >= 0 && idx < rateCounts.length) {
        rateCounts[idx]! += 1;
        totalSum += r.rating;
      }
    }

    const reviewsCount = reviews.length;
    const averageRating = reviewsCount === 0 ? 0 : Number((totalSum / reviewsCount).toFixed(1));

    return { reviewsCount, reviewsRating: averageRating, sumScore: averageRating, rateCounts };
  }

  private static toInquiryDetailDtos(inquiries: InquiryWithReply[]): DetailInquiry[] {
    return inquiries.map((inq) => {
      let reply: DetailInquiry['reply'];

      if (inq.reply && inq.reply.user) {
        reply = {
          id: inq.reply.id,
          content: inq.reply.content,
          createdAt: inq.reply.createdAt.toISOString(),
          updatedAt: inq.reply.updatedAt.toISOString(),
          user: {
            id: inq.reply.user.id,
            name: inq.reply.user.name,
          },
        };
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

  private static toCategoryDtos(p: ProductWithDetailRelations): CategoryResponse[] {
    return [{ id: p.categoryName, name: p.categoryName }];
  }

  private static toStockDtos(stocks: StockWithSize[]): StocksResponse[] {
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
