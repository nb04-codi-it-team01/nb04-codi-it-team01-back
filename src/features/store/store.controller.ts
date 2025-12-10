import { Request, Response, NextFunction } from 'express';
import { StoreService } from './store.service';
import { AppError } from '../../shared/middleware/error-handler';

export class StoreController {
  constructor(private readonly storeService = new StoreService()) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.type;
      const { name, address, detailAddress, phoneNumber, content, image } = req.body;

      if (!userId) {
        throw new AppError(401, '인증이 필요합니다.', 'Unauthorized');
      }

      if (!userType) {
        throw new AppError(403, '요청에 필요한 권한 정보가 누락되었습니다.', 'Forbidden');
      }

      const store = await this.storeService.create(userId, userType, {
        name,
        address,
        detailAddress,
        phoneNumber,
        content,
        image,
      });

      return res.status(201).json(store);
    } catch (err) {
      next(err);
    }
  };
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const storeId = req.params.storeId;
      const { name, address, detailAddress, phoneNumber, content, image } = req.body;

      if (!userId) {
        throw new AppError(401, '인증이 필요합니다.', 'Unauthorized');
      }

      if (!storeId) {
        throw new AppError(400, 'storeId가 URL 경로에 필요합니다.');
      }

      const store = await this.storeService.update(userId, storeId, {
        name,
        address,
        detailAddress,
        phoneNumber,
        content,
        image,
      });

      return res.status(200).json(store);
    } catch (err) {
      next(err);
    }
  };

  getStoreDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.params.storeId;

      if (!storeId) {
        throw new AppError(400, 'storeId가 URL 경로에 필요합니다.');
      }

      const store = await this.storeService.getStoreDetail(storeId);

      return res.status(200).json(store);
    } catch (err) {
      next(err);
    }
  };

  getMyStoreDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError(401, '인증이 필요합니다.', 'Unauthorized');
      }

      const store = await this.storeService.getMyStoreDetail(userId);

      return res.status(200).json(store);
    } catch (err) {
      next(err);
    }
  };

  userLikeRegister = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const storeId = req.params.storeId;

      if (!userId) {
        throw new AppError(401, '인증이 필요합니다.', 'Unauthorized');
      }

      if (!storeId) {
        throw new AppError(400, 'storeId가 URL 경로에 필요합니다.');
      }

      const store = await this.storeService.userLikeRegister(userId, storeId);

      return res.status(201).json(store);
    } catch (err) {
      next(err);
    }
  };

  userLikeUnregister = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const storeId = req.params.storeId;

      if (!userId) {
        throw new AppError(401, '인증이 필요합니다.', 'Unauthorized');
      }

      if (!storeId) {
        throw new AppError(400, 'storeId가 URL 경로에 필요합니다.');
      }

      await this.storeService.userLikeUnregister(userId, storeId);

      return res.status(204).json({ message: '관심 스토어 해제 완료' });
    } catch (err) {
      next(err);
    }
  };
}
