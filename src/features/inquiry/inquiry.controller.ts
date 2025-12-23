import { RequestHandler } from 'express';
import { AppError } from '../../shared/middleware/error-handler';
import { InquiryService } from './inquiry.service';
import {
  getInquiriesQuerySchema,
  inquiryIdParamSchema,
  updateInquirySchema,
  createReplySchema,
  replyIdParamSchema,
  updateReplySchema,
} from './inquiry.schema';

export class InquiryController {
  constructor(private readonly inquiryService = new InquiryService()) {}

  /**
   * GET /api/inquiries - 내 문의 조회
   */
  getMyInquiries: RequestHandler = async (req, res) => {
    const user = req.user;
    if (!user) {
      throw new AppError(401, '인증이 필요합니다.', 'Unauthorized');
    }

    const query = getInquiriesQuerySchema.parse(req.query);

    const inquiries = await this.inquiryService.getMyInquiries(user, query);

    return res.status(200).json(inquiries);
  };

  /**
   * GET /api/inquiries/:inquiryId - 문의 상세 조회
   */
  getInquiryDetail: RequestHandler = async (req, res) => {
    const user = req.user;
    if (!user) {
      throw new AppError(401, '인증이 필요합니다.', 'Unauthorized');
    }

    const { inquiryId } = inquiryIdParamSchema.parse(req.params);

    const inquiry = await this.inquiryService.getInquiryDetail(user.id, inquiryId);

    return res.status(200).json(inquiry);
  };

  /**
   * PATCH /api/inquiries/:inquiryId - 문의 수정
   */
  updateInquiry: RequestHandler = async (req, res) => {
    const user = req.user;
    if (!user) {
      throw new AppError(401, '인증이 필요합니다.', 'Unauthorized');
    }

    const { inquiryId } = inquiryIdParamSchema.parse(req.params);
    const body = updateInquirySchema.parse(req.body);

    const updatedInquiry = await this.inquiryService.updateInquiry(user.id, inquiryId, body);

    return res.status(200).json(updatedInquiry);
  };

  /**
   * DELETE /api/inquiries/:inquiryId - 문의 삭제
   */
  deleteInquiry: RequestHandler = async (req, res) => {
    const user = req.user;
    if (!user) {
      throw new AppError(401, '인증이 필요합니다.', 'Unauthorized');
    }

    const { inquiryId } = inquiryIdParamSchema.parse(req.params);

    const deletedInquiry = await this.inquiryService.deleteInquiry(user.id, inquiryId);

    return res.status(200).json(deletedInquiry);
  };

  /**
   * POST /api/inquiries/:inquiryId/replies - 문의 답변 생성
   */
  createReply: RequestHandler = async (req, res) => {
    const user = req.user;
    if (!user) {
      throw new AppError(401, '인증이 필요합니다.', 'Unauthorized');
    }

    const { inquiryId } = inquiryIdParamSchema.parse(req.params);
    const body = createReplySchema.parse(req.body);

    const reply = await this.inquiryService.createReply(user.id, inquiryId, body);

    return res.status(201).json(reply);
  };

  /**
   * PATCH /api/inquiries/:replyId/replies - 문의 답변 수정
   */
  updateReply: RequestHandler = async (req, res) => {
    const user = req.user;
    if (!user) {
      throw new AppError(401, '인증이 필요합니다.', 'Unauthorized');
    }

    const { replyId } = replyIdParamSchema.parse(req.params);
    const body = updateReplySchema.parse(req.body);

    const updatedReply = await this.inquiryService.updateReply(user.id, replyId, body);

    return res.status(200).json(updatedReply);
  };
}
