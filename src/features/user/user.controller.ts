import type { RequestHandler } from 'express';
import { UserService } from './user.service';
import { createUserSchema, updateUserSchema } from './user.schema';

export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * POST /api/users - 회원가입
   */
  createUser: RequestHandler = async (req, res) => {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      throw parsed.error;
    }

    const user = await this.userService.createUser(parsed.data);
    return res.status(201).json(user);
  };

  /**
   * GET /api/users/me - 내 정보 조회
   */
  getMyInfo: RequestHandler = async (req, res) => {
    const userInfo = await this.userService.getMyInfo(req.user!.id);
    return res.status(200).json(userInfo);
  };

  /**
   * PATCH /api/users/me - 내 정보 수정
   */
  updateMyInfo: RequestHandler = async (req, res) => {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      throw parsed.error;
    }

    const updatedUser = await this.userService.updateMyInfo(req.user!.id, parsed.data);
    return res.status(200).json(updatedUser);
  };

  /**
   * GET /api/users/me/likes - 관심 스토어 조회
   */
  getMyLikes: RequestHandler = async (req, res) => {
    const likes = await this.userService.getMyLikes(req.user!.id);
    return res.status(200).json(likes);
  };

  /**
   * DELETE /api/users/delete - 회원 탈퇴
   */
  deleteUser: RequestHandler = async (req, res) => {
    await this.userService.deleteUser(req.user!.id);
    return res.status(200).send();
  };
}
