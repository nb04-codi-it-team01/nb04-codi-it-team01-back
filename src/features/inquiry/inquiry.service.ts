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

export class InquiryService {
  constructor(private readonly inquiryRepository = new InquiryRepository()) {}

  /**
   * 내 문의 목록 조회 (판매자, 구매자 공용)
   */
  async getMyInquiries(userId: string, query: GetInquiriesQuery) {
    const { list, totalCount } = await this.inquiryRepository.findMyInquiries(userId, query);
    return toInquiryListResponseDto(list, totalCount);
  }

  /**
   * 문의 상세 조회
   */
  async getInquiryDetail(userId: string, inquiryId: string) {
    const inquiry = await this.inquiryRepository.findInquiryById(inquiryId);

    if (!inquiry) {
      throw new AppError(404, '문의가 존재하지 않습니다.', 'Not Found');
    }

    // 본인 문의인지 확인 (비공개 문의의 경우)
    if (inquiry.isSecret && inquiry.userId !== userId) {
      throw new AppError(403, '접근 권한이 없습니다.', 'Forbidden');
    }

    return toInquiryDetailDto(inquiry);
  }

  /**
   * 문의 수정
   */
  async updateInquiry(userId: string, inquiryId: string, body: UpdateInquiryBody) {
    const inquiry = await this.inquiryRepository.findInquiryById(inquiryId);

    if (!inquiry) {
      throw new AppError(404, '문의가 존재하지 않습니다.', 'Not Found');
    }

    // 본인 문의인지 확인
    if (inquiry.userId !== userId) {
      throw new AppError(403, '본인의 문의만 수정할 수 있습니다.', 'Forbidden');
    }

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
    const inquiry = await this.inquiryRepository.findInquiryById(inquiryId);

    if (!inquiry) {
      throw new AppError(404, '문의가 존재하지 않습니다.', 'Not Found');
    }

    // 본인 문의인지 확인
    if (inquiry.userId !== userId) {
      throw new AppError(403, '본인의 문의만 삭제할 수 있습니다.', 'Forbidden');
    }

    const deletedInquiry = await this.inquiryRepository.deleteInquiry(inquiryId);
    return toInquiryDto(deletedInquiry);
  }

  /**
   * 문의 답변 생성
   */
  async createReply(userId: string, inquiryId: string, body: CreateReplyBody) {
    const inquiry = await this.inquiryRepository.findInquiryById(inquiryId);

    if (!inquiry) {
      throw new AppError(404, '문의가 존재하지 않습니다.', 'Not Found');
    }

    // 이미 답변이 있는 경우
    if (inquiry.reply) {
      throw new AppError(400, '이미 답변이 존재합니다.', 'Bad Request');
    }

    // TODO: 판매자만 답변 가능하도록 권한 체크 (Store owner 확인 필요)

    const reply = await this.inquiryRepository.createReply(inquiryId, userId, body);

    // 문의 상태를 "답변 완료"로 변경
    await this.inquiryRepository.updateInquiryStatus(inquiryId, InquiryStatus.CompletedAnswer);

    return toReplyDto(reply);
  }

  /**
   * 문의 답변 수정
   */
  async updateReply(userId: string, replyId: string, body: UpdateReplyBody) {
    const reply = await this.inquiryRepository.findReplyById(replyId);

    if (!reply) {
      throw new AppError(404, '답변이 존재하지 않습니다.', 'Not Found');
    }

    // 본인 답변인지 확인
    if (reply.userId !== userId) {
      throw new AppError(403, '본인의 답변만 수정할 수 있습니다.', 'Forbidden');
    }

    const updatedReply = await this.inquiryRepository.updateReply(replyId, body);
    return toReplyDto(updatedReply);
  }
}
