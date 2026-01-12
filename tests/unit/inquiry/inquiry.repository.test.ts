/* eslint-disable @typescript-eslint/no-explicit-any */
import { InquiryRepository } from '../../../src/features/inquiry/inquiry.repository';
import prisma from '../../../src/lib/prisma';
import { InquiryStatus } from '@prisma/client';
import type { GetInquiriesQuery } from '../../../src/features/inquiry/inquiry.schema';
import {
  inquiryWithRelationsInclude,
  inquiryDetailInclude,
  inquiryWithStoreInclude,
  replyWithUserInclude,
} from '../../../src/features/inquiry/inquiry.type';

// Prisma Mocking
jest.mock('../../../src/lib/prisma', () => ({
  inquiry: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  inquiryReply: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}));

describe('InquiryRepository', () => {
  let inquiryRepository: InquiryRepository;

  beforeEach(() => {
    inquiryRepository = new InquiryRepository();
    jest.clearAllMocks();
  });

  describe('findMyInquiries', () => {
    const query: GetInquiriesQuery = {
      page: 1,
      pageSize: 10,
    };

    it('구매자 - 내가 작성한 문의 목록 조회', async () => {
      const userId = 'buyer-1';
      const userType = 'BUYER';
      const mockInquiries = [
        { id: 'inquiry-1', userId, title: '문의1' },
        { id: 'inquiry-2', userId, title: '문의2' },
      ];

      (prisma.inquiry.findMany as jest.Mock).mockResolvedValue(mockInquiries);
      (prisma.inquiry.count as jest.Mock).mockResolvedValue(2);

      const result = await inquiryRepository.findMyInquiries(userId, query, userType);

      expect(prisma.inquiry.findMany).toHaveBeenCalledWith({
        where: {
          userId,
        },
        include: inquiryWithRelationsInclude,
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
      expect(prisma.inquiry.count).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(result.list).toEqual(mockInquiries);
      expect(result.totalCount).toBe(2);
    });

    it('판매자 - 내 스토어에 달린 문의 목록 조회', async () => {
      const userId = 'seller-1';
      const userType = 'SELLER';
      const mockInquiries = [{ id: 'inquiry-1', title: '문의1' }];

      (prisma.inquiry.findMany as jest.Mock).mockResolvedValue(mockInquiries);
      (prisma.inquiry.count as jest.Mock).mockResolvedValue(1);

      await inquiryRepository.findMyInquiries(userId, query, userType);

      expect(prisma.inquiry.findMany).toHaveBeenCalledWith({
        where: {
          store: {
            userId,
          },
        },
        include: inquiryWithRelationsInclude,
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
    });

    it('상태 필터링이 있는 경우 - 답변 대기 문의만 조회', async () => {
      const userId = 'buyer-1';
      const userType = 'BUYER';
      const queryWithStatus: GetInquiriesQuery = {
        page: 1,
        pageSize: 10,
        status: 'WaitingAnswer',
      };

      (prisma.inquiry.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.inquiry.count as jest.Mock).mockResolvedValue(0);

      await inquiryRepository.findMyInquiries(userId, queryWithStatus, userType);

      expect(prisma.inquiry.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          status: 'WaitingAnswer',
        },
        include: inquiryWithRelationsInclude,
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
    });

    it('페이지네이션이 올바르게 계산되어야 한다', async () => {
      const userId = 'buyer-1';
      const userType = 'BUYER';
      const queryPage2: GetInquiriesQuery = {
        page: 2,
        pageSize: 5,
      };

      (prisma.inquiry.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.inquiry.count as jest.Mock).mockResolvedValue(0);

      await inquiryRepository.findMyInquiries(userId, queryPage2, userType);

      expect(prisma.inquiry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5, // (2-1) * 5
          take: 5,
        }),
      );
    });
  });

  describe('findInquiryById', () => {
    it('문의 ID로 상세 조회 시 reply, user를 포함해야 한다', async () => {
      const inquiryId = 'inquiry-1';
      const mockInquiry = { id: inquiryId, title: '문의1' };

      (prisma.inquiry.findUnique as jest.Mock).mockResolvedValue(mockInquiry);

      await inquiryRepository.findInquiryById(inquiryId);

      expect(prisma.inquiry.findUnique).toHaveBeenCalledWith({
        where: { id: inquiryId },
        include: inquiryDetailInclude,
      });
    });
  });

  describe('findInquiryByIdWithStore', () => {
    it('문의 ID로 조회 시 Store 정보를 포함해야 한다', async () => {
      const inquiryId = 'inquiry-1';
      const mockInquiry = {
        id: inquiryId,
        product: { store: { userId: 'seller-1' } },
      };

      (prisma.inquiry.findUnique as jest.Mock).mockResolvedValue(mockInquiry);

      await inquiryRepository.findInquiryByIdWithStore(inquiryId);

      expect(prisma.inquiry.findUnique).toHaveBeenCalledWith({
        where: { id: inquiryId },
        include: inquiryWithStoreInclude,
      });
    });
  });

  describe('updateInquiry', () => {
    it('문의를 수정', async () => {
      const inquiryId = 'inquiry-1';
      const updateData = {
        title: '수정된 제목',
        content: '수정된 내용',
        isSecret: true,
      };

      await inquiryRepository.updateInquiry(inquiryId, updateData);

      expect(prisma.inquiry.update).toHaveBeenCalledWith({
        where: { id: inquiryId },
        data: updateData,
      });
    });
  });

  describe('deleteInquiry', () => {
    it('문의를 익명화(userId를 null로 업데이트)', async () => {
      const inquiryId = 'inquiry-1';

      await inquiryRepository.deleteInquiry(inquiryId);

      expect(prisma.inquiry.update).toHaveBeenCalledWith({
        where: { id: inquiryId },
        data: { userId: null },
      });
    });
  });

  describe('createReply', () => {
    it('답변 생성 시 user를 포함해야 한다', async () => {
      const inquiryId = 'inquiry-1';
      const userId = 'seller-1';
      const replyData = { content: '답변 내용' };
      const mockReply = { id: 'reply-1', content: '답변 내용' };

      (prisma.inquiryReply.create as jest.Mock).mockResolvedValue(mockReply);

      await inquiryRepository.createReply(inquiryId, userId, replyData);

      expect(prisma.inquiryReply.create).toHaveBeenCalledWith({
        data: {
          inquiryId,
          userId,
          content: replyData.content,
        },
        include: replyWithUserInclude,
      });
    });

    it('트랜잭션 클라이언트가 전달되면 트랜잭션 내에서 실행', async () => {
      const inquiryId = 'inquiry-1';
      const userId = 'seller-1';
      const replyData = { content: '답변 내용' };
      const mockTx = {
        inquiryReply: {
          create: jest.fn().mockResolvedValue({ id: 'reply-1' }),
        },
      } as any;

      await inquiryRepository.createReply(inquiryId, userId, replyData, mockTx);

      expect(mockTx.inquiryReply.create).toHaveBeenCalledWith({
        data: {
          inquiryId,
          userId,
          content: replyData.content,
        },
        include: replyWithUserInclude,
      });
      expect(prisma.inquiryReply.create).not.toHaveBeenCalled();
    });
  });

  describe('findReplyById', () => {
    it('답변 ID로 조회 시 inquiry를 포함해야 한다', async () => {
      const replyId = 'reply-1';
      const mockReply = { id: replyId, content: '답변' };

      (prisma.inquiryReply.findUnique as jest.Mock).mockResolvedValue(mockReply);

      await inquiryRepository.findReplyById(replyId);

      expect(prisma.inquiryReply.findUnique).toHaveBeenCalledWith({
        where: { id: replyId },
        include: { inquiry: true },
      });
    });
  });

  describe('updateReply', () => {
    it('답변을 수정', async () => {
      const replyId = 'reply-1';
      const updateData = { content: '수정된 답변' };

      await inquiryRepository.updateReply(replyId, updateData);

      expect(prisma.inquiryReply.update).toHaveBeenCalledWith({
        where: { id: replyId },
        data: { content: updateData.content },
        include: replyWithUserInclude,
      });
    });
  });

  describe('updateInquiryStatus', () => {
    it('문의 상태를 업데이트', async () => {
      const inquiryId = 'inquiry-1';
      const status = InquiryStatus.CompletedAnswer;

      await inquiryRepository.updateInquiryStatus(inquiryId, status);

      expect(prisma.inquiry.update).toHaveBeenCalledWith({
        where: { id: inquiryId },
        data: { status },
      });
    });

    it('트랜잭션 클라이언트가 전달되면 트랜잭션 내에서 실행', async () => {
      const inquiryId = 'inquiry-1';
      const status = InquiryStatus.CompletedAnswer;
      const mockTx = {
        inquiry: {
          update: jest.fn().mockResolvedValue({ id: inquiryId }),
        },
      } as any;

      await inquiryRepository.updateInquiryStatus(inquiryId, status, mockTx);

      expect(mockTx.inquiry.update).toHaveBeenCalledWith({
        where: { id: inquiryId },
        data: { status },
      });
      expect(prisma.inquiry.update).not.toHaveBeenCalled();
    });
  });
});
