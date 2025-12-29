import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductRepository } from './product.repository';
import { NotificationService } from '../notification/notification.service';

export function createProductController(): ProductController {
  // 1. Repository 인스턴스 생성
  const productRepository = new ProductRepository();

  //임시
  const notificationService = new NotificationService();

  // 2. Service 인스턴스 생성 및 Repository 주입
  const productService = new ProductService(productRepository, notificationService);

  // 3. Controller 인스턴스 생성 및 Service 주입
  const controller = new ProductController(productService);

  return controller;
}
