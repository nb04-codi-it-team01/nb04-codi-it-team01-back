import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { ReviewRepository } from './review.repository';

export function createReviewController(): ReviewController {
  // 1. Repository 인스턴스 생성
  const productRepository = new ReviewRepository();

  // 2. Service 인스턴스 생성 및 Repository 주입
  const productService = new ReviewService(productRepository);

  // 3. Controller 인스턴스 생성 및 Service 주입
  const controller = new ReviewController(productService);

  return controller;
}
