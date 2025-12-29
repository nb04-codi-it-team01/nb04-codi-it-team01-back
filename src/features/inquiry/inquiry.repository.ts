import prisma from '../../lib/prisma';
import { InquiryStatus, Prisma } from '@prisma/client';
import type { GetInquiriesQuery, CreateReplyBody, UpdateReplyBody } from './inquiry.schema';
import {
  inquiryWithRelationsInclude,
  inquiryDetailInclude,
  inquiryWithStoreInclude,
  replyWithUserInclude,
} from './inquiry.type';
import { UserType } from '../../shared/types/auth';

export class InquiryRepository {
  // 내 문의 목록 조회
  async findMyInquiries(userId: string, query: GetInquiriesQuery, userType: UserType) {
    const { page, pageSize, status } = query;
    const skip = (page - 1) * pageSize;

    let where: Prisma.InquiryWhereInput;

    if (userType === 'SELLER') {
      // 판매자 - 내 스토어의 상품들에 달린 문의 조회
      where = {
        product: {
          store: {
            userId: userId, // 상품의 스토어 주인이 나인 경우
          },
        },
        ...(status ? { status } : {}),
      };
    } else {
      // 구매자 - 내가 작성한 문의 조회
      where = {
        userId: userId,
        ...(status ? { status } : {}),
      };
    }

    const [list, totalCount] = await Promise.all([
      prisma.inquiry.findMany({
        where,
        include: inquiryWithRelationsInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.inquiry.count({ where }),
    ]);

    return { list, totalCount };
  }

  // 문의 상세 조회
  async findInquiryById(inquiryId: string) {
    return prisma.inquiry.findUnique({
      where: { id: inquiryId },
      include: inquiryDetailInclude,
    });
  }

  // 문의 조회 (Store 정보 포함 - 권한 체크용)
  async findInquiryByIdWithStore(inquiryId: string) {
    return prisma.inquiry.findUnique({
      where: { id: inquiryId },
      include: inquiryWithStoreInclude,
    });
  }

  // 문의 수정
  async updateInquiry(
    inquiryId: string,
    data: { title: string; content: string; isSecret: boolean },
  ) {
    return prisma.inquiry.update({
      where: { id: inquiryId },
      data,
    });
  }

  // 문의 삭제
  async deleteInquiry(inquiryId: string) {
    return prisma.inquiry.delete({
      where: { id: inquiryId },
    });
  }

  // 답변 생성
  async createReply(
    inquiryId: string,
    userId: string,
    data: CreateReplyBody,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx || prisma;
    return db.inquiryReply.create({
      data: {
        inquiryId,
        userId,
        content: data.content,
      },
      include: replyWithUserInclude,
    });
  }

  // 답변 조회 (by ID)
  async findReplyById(replyId: string) {
    return prisma.inquiryReply.findUnique({
      where: { id: replyId },
      include: {
        inquiry: true,
      },
    });
  }

  // 답변 수정
  async updateReply(replyId: string, data: UpdateReplyBody) {
    return prisma.inquiryReply.update({
      where: { id: replyId },
      data: {
        content: data.content,
      },
      include: replyWithUserInclude,
    });
  }

  // 문의 상태 업데이트 (답변 완료)
  async updateInquiryStatus(
    inquiryId: string,
    status: InquiryStatus,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx || prisma;
    return db.inquiry.update({
      where: { id: inquiryId },
      data: { status },
    });
  }
}
