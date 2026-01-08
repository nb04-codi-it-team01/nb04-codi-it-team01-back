import { Prisma } from '@prisma/client';

/* ---------- 리스트 조회용 타입 ---------- */
// 서비스 파일에 있던 include 객체를 여기로 옮기거나, 타입을 위해 구조만 정의
export const productListInclude = {
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

export type ProductWithListRelations = Prisma.ProductGetPayload<{
  include: typeof productListInclude;
}>;

/* ---------- 상세 조회용 타입 ---------- */
// 기존에 정의되어 있던 타입이라고 가정 (없으면 이것도 추가)
export type ProductWithDetailRelations = Prisma.ProductGetPayload<{
  include: {
    store: true;
    stocks: {
      include: { size: true };
    };
    reviews: true;
    inquiries: {
      include: {
        reply: {
          include: {
            user: true;
          };
        };
      };
    };
  };
}>;

/* ---------- 매퍼 내부용 서브 타입 (any 제거용) ---------- */
// 문의 목록 내부 타입
export type InquiryWithReply = Prisma.InquiryGetPayload<{
  include: {
    reply: {
      include: {
        user: true;
      };
    };
  };
}>;

// 재고 목록 내부 타입
export type StockWithSize = Prisma.StockGetPayload<{
  include: {
    size: true;
  };
}>;

// 문의 리스트 조회용 (작성자 정보 + 답변 + 답변 작성자 정보 포함)
export type InquiryWithRelations = Prisma.InquiryGetPayload<{
  include: {
    user: {
      select: { name: true };
    };
    reply: {
      include: {
        user: {
          select: { name: true };
        };
      };
    };
  };
}>;
