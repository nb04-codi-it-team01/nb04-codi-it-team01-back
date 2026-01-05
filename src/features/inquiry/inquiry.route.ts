import { Router } from 'express';
import { InquiryController } from './inquiry.controller';
import { accessTokenAuth } from '../../shared/middleware/auth';
import { validateBody, validateParams, validateQuery } from '../../shared/middleware/validate';
import {
  getInquiriesQuerySchema,
  updateInquirySchema,
  createReplySchema,
  updateReplySchema,
  inquiryIdParamSchema,
  replyIdParamSchema,
} from './inquiry.schema';

const router = Router();
const inquiryController = new InquiryController();

// 내 문의 조회
router.get(
  '/inquiries',
  accessTokenAuth,
  validateQuery(getInquiriesQuerySchema),
  inquiryController.getMyInquiries,
);

// 문의 상세 조회
router.get(
  '/inquiries/:inquiryId',
  accessTokenAuth,
  validateParams(inquiryIdParamSchema),
  inquiryController.getInquiryDetail,
);

// 문의 수정
router.patch(
  '/inquiries/:inquiryId',
  accessTokenAuth,
  validateParams(inquiryIdParamSchema),
  validateBody(updateInquirySchema),
  inquiryController.updateInquiry,
);

// 문의 삭제
router.delete(
  '/inquiries/:inquiryId',
  accessTokenAuth,
  validateParams(inquiryIdParamSchema),
  inquiryController.deleteInquiry,
);

// 문의 답변 생성
router.post(
  '/inquiries/:inquiryId/replies',
  accessTokenAuth,
  validateParams(inquiryIdParamSchema),
  validateBody(createReplySchema),
  inquiryController.createReply,
);

// 문의 답변 수정
router.patch(
  '/inquiries/:replyId/replies',
  accessTokenAuth,
  validateParams(replyIdParamSchema),
  validateBody(updateReplySchema),
  inquiryController.updateReply,
);

export default router;
