import prisma from '../../lib/prisma';
import type { GetInquiriesQuery, CreateReplyBody, UpdateReplyBody } from './inquiry.schema';
import {
  inquiryWithRelationsInclude,
  inquiryDetailInclude,
  replyWithUserInclude,
} from './inquiry.type';

export class InquiryRepository {
  // 내 문의 목록 조회
  async findMyInquiries(userId: string, query: GetInquiriesQuery) {
    const { page, pageSize, status } = query;
    const skip = (page - 1) * pageSize;

    const where = {
      userId,
      ...(status ? { status } : {}),
    };

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
  async createReply(inquiryId: string, userId: string, data: CreateReplyBody) {
    return prisma.inquiryReply.create({
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
  async updateInquiryStatus(inquiryId: string, status: string) {
    return prisma.inquiry.update({
      where: { id: inquiryId },
      data: { status },
    });
  }
}
