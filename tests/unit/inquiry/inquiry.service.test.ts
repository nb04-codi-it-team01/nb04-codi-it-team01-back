/* eslint-disable @typescript-eslint/no-explicit-any */
import { InquiryService } from '../../../src/features/inquiry/inquiry.service';
import { InquiryRepository } from '../../../src/features/inquiry/inquiry.repository';
import { NotificationService } from '../../../src/features/notification/notification.service';
import { AppError } from '../../../src/shared/middleware/error-handler';
import { InquiryStatus } from '@prisma/client';
import type {
  GetInquiriesQuery,
  UpdateInquiryBody,
  CreateReplyBody,
  UpdateReplyBody,
} from '../../../src/features/inquiry/inquiry.schema';
import prisma from '../../../src/lib/prisma';

// 의존성 모킹
jest.mock('../../../src/features/inquiry/inquiry.repository');
jest.mock('../../../src/features/notification/notification.service');
jest.mock('../../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
  },
}));

describe('InquiryService', () => {
  let inquiryService: InquiryService;
  let mockInquiryRepository: jest.Mocked<InquiryRepository>;
  let mockNotificationService: jest.Mocked<NotificationService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockInquiryRepository = new InquiryRepository() as jest.Mocked<InquiryRepository>;
    mockNotificationService = new NotificationService(
      {} as any,
    ) as jest.Mocked<NotificationService>;

    // NotificationService의 createNotification을 mock
    mockNotificationService.createNotification = jest.fn().mockResolvedValue({});

    inquiryService = new InquiryService(mockInquiryRepository, mockNotificationService);
  });

  describe('getMyInquiries', () => {
    const query: GetInquiriesQuery = {
      page: 1,
      pageSize: 10,
    };

    const mockInquiries = [
      {
        id: 'inquiry-1',
        userId: 'user-1',
        productId: 'product-1',
        storeId: 'store-1',
        title: '문의1',
        content: '내용1',
        isSecret: false,
        status: InquiryStatus.WaitingAnswer,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
        product: {
          id: 'product-1',
          name: '상품1',
          store: {
            id: 'store-1',
            name: '스토어1',
          },
        },
        user: {
          id: 'user-1',
          name: '유저1',
          image: 'http://example.com/image.jpg',
        },
      },
    ];

    it('구매자 - 내 문의 목록 조회 성공', async () => {
      const user = { id: 'user-1', type: 'BUYER' as const };

      mockInquiryRepository.findMyInquiries.mockResolvedValue({
        list: mockInquiries as any,
        totalCount: 1,
      });

      const result = await inquiryService.getMyInquiries(user, query);

      expect(mockInquiryRepository.findMyInquiries).toHaveBeenCalledWith(user.id, query, user.type);
      expect(result.list).toHaveLength(1);
      expect(result.totalCount).toBe(1);
    });

    it('판매자 - 내 스토어 문의 목록 조회 성공', async () => {
      const user = { id: 'seller-1', type: 'SELLER' as const };

      mockInquiryRepository.findMyInquiries.mockResolvedValue({
        list: mockInquiries as any,
        totalCount: 1,
      });

      await inquiryService.getMyInquiries(user, query);

      expect(mockInquiryRepository.findMyInquiries).toHaveBeenCalledWith(user.id, query, user.type);
    });
  });

  describe('getInquiryDetail', () => {
    const mockInquiry = {
      id: 'inquiry-1',
      userId: 'user-1',
      productId: 'product-1',
      storeId: 'store-1',
      title: '문의1',
      content: '내용1',
      isSecret: false,
      status: InquiryStatus.WaitingAnswer,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      product: {
        id: 'product-1',
        name: '상품1',
        store: {
          id: 'store-1',
          userId: 'seller-1',
        },
      },
      user: {
        id: 'user-1',
        name: '유저1',
        image: 'http://example.com/image.jpg',
      },
      reply: null,
    };

    it('공개 문의 상세 조회 성공', async () => {
      mockInquiryRepository.findInquiryByIdWithStore.mockResolvedValue(mockInquiry as any);

      const result = await inquiryService.getInquiryDetail('user-2', 'inquiry-1');

      expect(mockInquiryRepository.findInquiryByIdWithStore).toHaveBeenCalledWith('inquiry-1');
      expect(result.id).toBe('inquiry-1');
    });

    it('비공개 문의 - 작성자 본인 조회 성공', async () => {
      const secretInquiry = { ...mockInquiry, isSecret: true };
      mockInquiryRepository.findInquiryByIdWithStore.mockResolvedValue(secretInquiry as any);

      const result = await inquiryService.getInquiryDetail('user-1', 'inquiry-1');

      expect(result.id).toBe('inquiry-1');
    });

    it('비공개 문의 - 판매자 조회 성공', async () => {
      const secretInquiry = { ...mockInquiry, isSecret: true };
      mockInquiryRepository.findInquiryByIdWithStore.mockResolvedValue(secretInquiry as any);

      const result = await inquiryService.getInquiryDetail('seller-1', 'inquiry-1');

      expect(result.id).toBe('inquiry-1');
    });

    it('비공개 문의 - 권한 없는 사용자 조회 시 403 에러 발생', async () => {
      const secretInquiry = { ...mockInquiry, isSecret: true };
      mockInquiryRepository.findInquiryByIdWithStore.mockResolvedValue(secretInquiry as any);

      await expect(inquiryService.getInquiryDetail('user-2', 'inquiry-1')).rejects.toThrow(
        new AppError(403, '접근 권한이 없습니다.', 'Forbidden'),
      );
    });

    it('문의가 존재하지 않으면 404 에러 발생', async () => {
      mockInquiryRepository.findInquiryByIdWithStore.mockResolvedValue(null);

      await expect(inquiryService.getInquiryDetail('user-1', 'inquiry-1')).rejects.toThrow(
        new AppError(404, '문의가 존재하지 않습니다.', 'Not Found'),
      );
    });
  });

  describe('updateInquiry', () => {
    const mockInquiry = {
      id: 'inquiry-1',
      userId: 'user-1',
      productId: 'product-1',
      storeId: 'store-1',
      title: '문의1',
      content: '내용1',
      isSecret: false,
      status: InquiryStatus.WaitingAnswer,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      reply: null,
    };

    const updateBody: UpdateInquiryBody = {
      title: '수정된 제목',
      content: '수정된 내용',
      isSecret: true,
    };

    it('문의 수정 성공', async () => {
      const updatedInquiry = {
        ...mockInquiry,
        ...updateBody,
      };

      mockInquiryRepository.findInquiryById.mockResolvedValue(mockInquiry as any);
      mockInquiryRepository.updateInquiry.mockResolvedValue(updatedInquiry as any);

      const result = await inquiryService.updateInquiry('user-1', 'inquiry-1', updateBody);

      expect(mockInquiryRepository.findInquiryById).toHaveBeenCalledWith('inquiry-1');
      expect(mockInquiryRepository.updateInquiry).toHaveBeenCalledWith('inquiry-1', updateBody);
      expect(result.title).toBe('수정된 제목');
    });

    it('본인의 문의가 아니면 403 에러 발생', async () => {
      mockInquiryRepository.findInquiryById.mockResolvedValue(mockInquiry as any);

      await expect(inquiryService.updateInquiry('user-2', 'inquiry-1', updateBody)).rejects.toThrow(
        new AppError(403, '본인의 문의만 수정/삭제할 수 있습니다.', 'Forbidden'),
      );

      expect(mockInquiryRepository.updateInquiry).not.toHaveBeenCalled();
    });

    it('문의가 존재하지 않으면 404 에러 발생', async () => {
      mockInquiryRepository.findInquiryById.mockResolvedValue(null);

      await expect(inquiryService.updateInquiry('user-1', 'inquiry-1', updateBody)).rejects.toThrow(
        new AppError(404, '문의가 존재하지 않습니다.', 'Not Found'),
      );

      expect(mockInquiryRepository.updateInquiry).not.toHaveBeenCalled();
    });

    it('답변이 완료된 문의는 수정할 수 없음', async () => {
      const inquiryWithReply = {
        ...mockInquiry,
        reply: {
          id: 'reply-1',
          content: '답변',
        },
      };

      mockInquiryRepository.findInquiryById.mockResolvedValue(inquiryWithReply as any);

      await expect(inquiryService.updateInquiry('user-1', 'inquiry-1', updateBody)).rejects.toThrow(
        new AppError(400, '답변이 완료된 문의는 수정할 수 없습니다.', 'Bad Request'),
      );

      expect(mockInquiryRepository.updateInquiry).not.toHaveBeenCalled();
    });
  });

  describe('deleteInquiry', () => {
    const mockInquiry = {
      id: 'inquiry-1',
      userId: 'user-1',
      productId: 'product-1',
      storeId: 'store-1',
      title: '문의1',
      content: '내용1',
      isSecret: false,
      status: InquiryStatus.WaitingAnswer,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      reply: null,
    };

    it('문의 삭제 성공', async () => {
      mockInquiryRepository.findInquiryById.mockResolvedValue(mockInquiry as any);
      mockInquiryRepository.deleteInquiry.mockResolvedValue(mockInquiry as any);

      await inquiryService.deleteInquiry('user-1', 'inquiry-1');

      expect(mockInquiryRepository.findInquiryById).toHaveBeenCalledWith('inquiry-1');
      expect(mockInquiryRepository.deleteInquiry).toHaveBeenCalledWith('inquiry-1');
    });

    it('본인의 문의가 아니면 403 에러 발생', async () => {
      mockInquiryRepository.findInquiryById.mockResolvedValue(mockInquiry as any);

      await expect(inquiryService.deleteInquiry('user-2', 'inquiry-1')).rejects.toThrow(
        new AppError(403, '본인의 문의만 수정/삭제할 수 있습니다.', 'Forbidden'),
      );

      expect(mockInquiryRepository.deleteInquiry).not.toHaveBeenCalled();
    });

    it('문의가 존재하지 않으면 404 에러 발생', async () => {
      mockInquiryRepository.findInquiryById.mockResolvedValue(null);

      await expect(inquiryService.deleteInquiry('user-1', 'inquiry-1')).rejects.toThrow(
        new AppError(404, '문의가 존재하지 않습니다.', 'Not Found'),
      );

      expect(mockInquiryRepository.deleteInquiry).not.toHaveBeenCalled();
    });
  });

  describe('createReply', () => {
    const mockInquiry = {
      id: 'inquiry-1',
      userId: 'user-1',
      productId: 'product-1',
      storeId: 'store-1',
      title: '문의1',
      content: '내용1',
      isSecret: false,
      status: InquiryStatus.WaitingAnswer,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      product: {
        id: 'product-1',
        name: '상품1',
        store: {
          id: 'store-1',
          userId: 'seller-1',
        },
      },
      reply: null,
    };

    const replyBody: CreateReplyBody = {
      content: '답변 내용입니다.',
    };

    it('답변 생성 성공', async () => {
      const mockReply = {
        id: 'reply-1',
        inquiryId: 'inquiry-1',
        userId: 'seller-1',
        content: '답변 내용입니다.',
        createdAt: new Date('2025-01-02'),
        updatedAt: new Date('2025-01-02'),
        user: {
          id: 'seller-1',
          name: '판매자1',
          image: 'http://example.com/seller.jpg',
        },
      };

      mockInquiryRepository.findInquiryByIdWithStore.mockResolvedValue(mockInquiry as any);

      // $transaction mock 설정
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        mockInquiryRepository.createReply.mockResolvedValue(mockReply as any);
        mockInquiryRepository.updateInquiryStatus.mockResolvedValue({} as any);
        return callback({});
      });

      const result = await inquiryService.createReply('seller-1', 'inquiry-1', replyBody);

      expect(mockInquiryRepository.findInquiryByIdWithStore).toHaveBeenCalledWith('inquiry-1');
      expect(result.content).toBe('답변 내용입니다.');
      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
        'user-1',
        '상품1',
        'REPLY',
      );
    });

    it('판매자가 아니면 403 에러 발생', async () => {
      mockInquiryRepository.findInquiryByIdWithStore.mockResolvedValue(mockInquiry as any);

      await expect(inquiryService.createReply('user-2', 'inquiry-1', replyBody)).rejects.toThrow(
        new AppError(403, '해당 상품의 판매자만 답변할 수 있습니다.', 'Forbidden'),
      );
    });

    it('문의가 존재하지 않으면 404 에러 발생', async () => {
      mockInquiryRepository.findInquiryByIdWithStore.mockResolvedValue(null);

      await expect(inquiryService.createReply('seller-1', 'inquiry-1', replyBody)).rejects.toThrow(
        new AppError(404, '문의가 존재하지 않습니다.', 'Not Found'),
      );
    });

    it('이미 답변이 존재하면 400 에러 발생', async () => {
      const inquiryWithReply = {
        ...mockInquiry,
        reply: {
          id: 'reply-1',
          content: '기존 답변',
        },
      };

      mockInquiryRepository.findInquiryByIdWithStore.mockResolvedValue(inquiryWithReply as any);

      await expect(inquiryService.createReply('seller-1', 'inquiry-1', replyBody)).rejects.toThrow(
        new AppError(400, '이미 답변이 존재합니다.', 'Bad Request'),
      );
    });

    it('상품이 삭제된 경우 404 에러 발생', async () => {
      const inquiryWithoutProduct = {
        ...mockInquiry,
        product: null,
      };

      mockInquiryRepository.findInquiryByIdWithStore.mockResolvedValue(
        inquiryWithoutProduct as any,
      );

      await expect(inquiryService.createReply('seller-1', 'inquiry-1', replyBody)).rejects.toThrow(
        new AppError(404, '상품이 존재하지 않습니다.', 'Not Found'),
      );
    });

    it('스토어가 삭제된 경우 404 에러 발생', async () => {
      const inquiryWithoutStore = {
        ...mockInquiry,
        product: {
          id: 'product-1',
          name: '상품1',
          store: null,
        },
      };

      mockInquiryRepository.findInquiryByIdWithStore.mockResolvedValue(inquiryWithoutStore as any);

      await expect(inquiryService.createReply('seller-1', 'inquiry-1', replyBody)).rejects.toThrow(
        new AppError(404, '스토어가 존재하지 않습니다.', 'Not Found'),
      );
    });
  });

  describe('updateReply', () => {
    const mockReply = {
      id: 'reply-1',
      inquiryId: 'inquiry-1',
      userId: 'seller-1',
      content: '답변 내용',
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      inquiry: {
        id: 'inquiry-1',
        productId: 'product-1',
      },
    };

    const updateBody: UpdateReplyBody = {
      content: '수정된 답변 내용',
    };

    it('답변 수정 성공', async () => {
      const updatedReply = {
        ...mockReply,
        content: '수정된 답변 내용',
        user: {
          id: 'seller-1',
          name: '판매자1',
          image: 'http://example.com/seller.jpg',
        },
      };

      mockInquiryRepository.findReplyById.mockResolvedValue(mockReply as any);
      mockInquiryRepository.updateReply.mockResolvedValue(updatedReply as any);

      const result = await inquiryService.updateReply('seller-1', 'reply-1', updateBody);

      expect(mockInquiryRepository.findReplyById).toHaveBeenCalledWith('reply-1');
      expect(mockInquiryRepository.updateReply).toHaveBeenCalledWith('reply-1', updateBody);
      expect(result.content).toBe('수정된 답변 내용');
    });

    it('본인의 답변이 아니면 403 에러 발생', async () => {
      mockInquiryRepository.findReplyById.mockResolvedValue(mockReply as any);

      await expect(inquiryService.updateReply('user-2', 'reply-1', updateBody)).rejects.toThrow(
        new AppError(403, '본인의 답변만 수정할 수 있습니다.', 'Forbidden'),
      );

      expect(mockInquiryRepository.updateReply).not.toHaveBeenCalled();
    });

    it('답변이 존재하지 않으면 404 에러 발생', async () => {
      mockInquiryRepository.findReplyById.mockResolvedValue(null);

      await expect(inquiryService.updateReply('seller-1', 'reply-1', updateBody)).rejects.toThrow(
        new AppError(404, '답변이 존재하지 않습니다.', 'Not Found'),
      );

      expect(mockInquiryRepository.updateReply).not.toHaveBeenCalled();
    });

    it('삭제된 상품의 문의 답변은 수정할 수 없음', async () => {
      const replyWithoutProduct = {
        ...mockReply,
        inquiry: {
          id: 'inquiry-1',
          productId: null,
        },
      };

      mockInquiryRepository.findReplyById.mockResolvedValue(replyWithoutProduct as any);

      await expect(inquiryService.updateReply('seller-1', 'reply-1', updateBody)).rejects.toThrow(
        new AppError(400, '삭제된 상품의 문의 답변은 수정할 수 없습니다.', 'Bad Request'),
      );

      expect(mockInquiryRepository.updateReply).not.toHaveBeenCalled();
    });
  });
});
