import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';

export function createAuthController(): AuthController {
  // 1. Repository 인스턴스 생성
  const productRepository = new AuthRepository();

  // 2. Service 인스턴스 생성 및 Repository 주입
  const productService = new AuthService(productRepository);

  // 3. Controller 인스턴스 생성 및 Service 주입
  const controller = new AuthController(productService);

  return controller;
}
