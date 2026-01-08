import { InquiryController } from './inquiry.controller';
import { InquiryService } from './inquiry.service';
import { InquiryRepository } from './inquiry.repository';
import { NotificationService } from '../notification/notification.service';
import { NotificationRepository } from '../notification/notification.repository';

export function createInquiryController(): InquiryController {
  // 1. Repository 인스턴스 생성
  const inquiryRepository = new InquiryRepository();
  const notificationRepository = new NotificationRepository();

  // 2. Service 인스턴스 생성 및 Repository 주입
  const notificationService = new NotificationService(notificationRepository);
  const inquiryService = new InquiryService(inquiryRepository, notificationService);

  // 3. Controller 인스턴스 생성 및 Service 주입
  const controller = new InquiryController(inquiryService);

  return controller;
}
