import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';

export function createUserController(): UserController {
  // 1. Repository 인스턴스 생성
  const userRepository = new UserRepository();

  // 2. Service 인스턴스 생성 및 Repository 주입
  const userService = new UserService(userRepository);

  // 3. Controller 인스턴스 생성 및 Service 주입
  const controller = new UserController(userService);

  return controller;
}
