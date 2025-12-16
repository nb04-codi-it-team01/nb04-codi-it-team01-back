import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductRepository } from './product.repository';

export function createProductController(): ProductController {
  // 1. Repository 인스턴스 생성
  const productRepository = new ProductRepository();

  // 2. Service 인스턴스 생성 및 Repository 주입
  const productService = new ProductService(productRepository);

  // 3. Controller 인스턴스 생성 및 Service 주입
  const controller = new ProductController(productService);

  return controller;
}
