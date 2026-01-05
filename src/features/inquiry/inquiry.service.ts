import { InquiryStatus } from '@prisma/client';
import { AppError } from '../../shared/middleware/error-handler';
import { InquiryRepository } from './inquiry.repository';
import type {
  GetInquiriesQuery,
  UpdateInquiryBody,
  CreateReplyBody,
  UpdateReplyBody,
} from './inquiry.schema';
import {
  toInquiryListResponseDto,
  toInquiryDetailDto,
  toInquiryDto,
  toReplyDto,
} from './inquiry.mapper';
import { UserType } from '../../shared/types/auth';
import prisma from '../../lib/prisma';
import { NotificationService } from '../notification/notification.service';

export class InquiryService {
  constructor(
    private readonly inquiryRepository: InquiryRepository,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 문의 조회 헬퍼 메서드
   */
  private async getInquiryOrThrow(inquiryId: string) {
    const inquiry = await this.inquiryRepository.findInquiryById(inquiryId);
    if (!inquiry) {
      throw new AppError(404, '문의가 존재하지 않습니다.', 'Not Found');
    }
    return inquiry;
  }

  /**
   * 문의 조회 및 작성자 검증 헬퍼 메서드
   */
  private async getInquiryAndVerifyAuthor(inquiryId: string, userId: string) {
    const inquiry = await this.getInquiryOrThrow(inquiryId);
    if (inquiry.userId !== userId) {
      throw new AppError(403, '본인의 문의만 수정/삭제할 수 있습니다.', 'Forbidden');
    }
    return inquiry;
  }

  /**
   * 답변 조회 헬퍼 메서드
   */
  private async getReplyOrThrow(replyId: string) {
    const reply = await this.inquiryRepository.findReplyById(replyId);
    if (!reply) {
      throw new AppError(404, '답변이 존재하지 않습니다.', 'Not Found');
    }
    return reply;
  }

  /**
   * 내 문의 목록 조회 (판매자, 구매자 공용)
   */
  async getMyInquiries(user: { id: string; type: UserType }, query: GetInquiriesQuery) {
    const { list, totalCount } = await this.inquiryRepository.findMyInquiries(
      user.id,
      query,
      user.type,
    );
    return toInquiryListResponseDto(list, totalCount);
  }

  /**
   * 문의 상세 조회
   */
  async getInquiryDetail(userId: string, inquiryId: string) {
    const inquiry = await this.inquiryRepository.findInquiryByIdWithStore(inquiryId);

    if (!inquiry) {
      throw new AppError(404, '문의가 존재하지 않습니다.', 'Not Found');
    }

    const isOwner = inquiry.userId === userId;
    const isStoreOwner = !!(inquiry.product?.store?.userId === userId);

    // 본인 또는 판매자만 조회 가능 (비공개 문의의 경우)
    if (inquiry.isSecret && !isOwner && !isStoreOwner) {
      throw new AppError(403, '접근 권한이 없습니다.', 'Forbidden');
    }

    return toInquiryDetailDto(inquiry);
  }

  /**
   * 문의 수정
   */
  async updateInquiry(userId: string, inquiryId: string, body: UpdateInquiryBody) {
    const inquiry = await this.getInquiryAndVerifyAuthor(inquiryId, userId);

    // 답변이 이미 달린 경우 수정 불가
    if (inquiry.reply) {
      throw new AppError(400, '답변이 완료된 문의는 수정할 수 없습니다.', 'Bad Request');
    }

    const updatedInquiry = await this.inquiryRepository.updateInquiry(inquiryId, body);
    return toInquiryDto(updatedInquiry);
  }

  /**
   * 문의 삭제
   */
  async deleteInquiry(userId: string, inquiryId: string) {
    await this.getInquiryAndVerifyAuthor(inquiryId, userId);

    const deletedInquiry = await this.inquiryRepository.deleteInquiry(inquiryId);
    return toInquiryDto(deletedInquiry);
  }

  /**
   * 문의 답변 생성
   */
  async createReply(userId: string, inquiryId: string, body: CreateReplyBody) {
    const inquiry = await this.inquiryRepository.findInquiryByIdWithStore(inquiryId);

    if (!inquiry) {
      throw new AppError(404, '문의가 존재하지 않습니다.', 'Not Found');
    }

    // 이미 답변이 있는 경우
    if (inquiry.reply) {
      throw new AppError(400, '이미 답변이 존재합니다.', 'Bad Request');
    }

    // 상품이 삭제된 경우
    if (!inquiry.product) {
      throw new AppError(404, '상품이 존재하지 않습니다.', 'Not Found');
    }

    // 스토어가 삭제된 경우
    if (!inquiry.product.store) {
      throw new AppError(404, '스토어가 존재하지 않습니다.', 'Not Found');
    }

    // 판매자만 답변 가능하도록 권한 체크
    const isStoreOwner = inquiry.product.store.userId === userId;
    if (!isStoreOwner) {
      throw new AppError(403, '해당 상품의 판매자만 답변할 수 있습니다.', 'Forbidden');
    }

    const result = prisma.$transaction(async (tx) => {
      // 2. 답변 생성 (tx 전달)
      const reply = await this.inquiryRepository.createReply(inquiryId, userId, body, tx);

      // 3. 상태 변경 (tx 전달)
      await this.inquiryRepository.updateInquiryStatus(
        inquiryId,
        InquiryStatus.CompletedAnswer,
        tx,
      );

      return toReplyDto(reply);
    });

    // 알림 생성
    if (inquiry.userId) {
      this.notificationService
        .createNotification(inquiry.userId, inquiry.product!.name, 'REPLY')
        .catch((err) => console.error('알림 발송 실패:', err));
    }

    return result;
  }

  /**
   * 문의 답변 수정
   */
  async updateReply(userId: string, replyId: string, body: UpdateReplyBody) {
    const reply = await this.getReplyOrThrow(replyId);

    // 상품 삭제 여부 확인
    if (!reply.inquiry?.productId) {
      throw new AppError(400, '삭제된 상품의 문의 답변은 수정할 수 없습니다.', 'Bad Request');
    }

    // 본인 답변인지 확인
    if (reply.userId !== userId) {
      throw new AppError(403, '본인의 답변만 수정할 수 있습니다.', 'Forbidden');
    }

    const updatedReply = await this.inquiryRepository.updateReply(replyId, body);
    return toReplyDto(updatedReply);
  }
}
