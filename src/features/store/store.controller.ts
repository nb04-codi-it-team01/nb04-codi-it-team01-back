import { Request, Response, NextFunction } from 'express';
import { StoreService } from './store.service';
import { AppError } from '../../shared/middleware/error-handler';
import {
  storeIdParamSchema,
  createStoreBodySchema,
  createStoreBody,
  updateStoreBodySchema,
  updateStoreBody,
  getMyProductsQuerySchema,
} from './store.schema';

export class StoreController {
  constructor(private readonly storeService = new StoreService()) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.type;

      if (!userId) {
        throw new AppError(401, '인증이 필요합니다.', 'Unauthorized');
      }

      if (!userType) {
        throw new AppError(403, '요청에 필요한 권한 정보가 누락되었습니다.', 'Forbidden');
      }

      const parsed = createStoreBodySchema.safeParse(req.body);

      if (!parsed.success) throw parsed.error;

      const body: createStoreBody = parsed.data;

      const store = await this.storeService.create(userId, userType, body);

      return res.status(201).json(store);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError(401, '인증이 필요합니다.', 'Unauthorized');
      }

      const parsedId = storeIdParamSchema.safeParse(req.params);
      if (!parsedId.success) throw parsedId.error;

      const { storeId } = parsedId.data;

      const parsedBody = updateStoreBodySchema.safeParse(req.body);

      if (!parsedBody.success) throw parsedBody.error;

      const body: updateStoreBody = parsedBody.data;

      const store = await this.storeService.update(userId, storeId, body);

      return res.status(200).json(store);
    } catch (err) {
      next(err);
    }
  };

  getStoreDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsedBody = storeIdParamSchema.safeParse(req.params);
      if (!parsedBody.success) throw parsedBody.error;

      const { storeId } = parsedBody.data;

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

  getMyProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError(401, '인증이 필요합니다.', 'Unauthorized');
      }
      const parsed = getMyProductsQuerySchema.safeParse(req.query);
      if (!parsed.success) throw parsed.error;

      const { page, pageSize } = parsed.data;

      const data = await this.storeService.getMyProducts(userId, page, pageSize);
      res.json(data);
    } catch (err) {
      next(err);
    }
  };

  userLikeRegister = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError(401, '인증이 필요합니다.', 'Unauthorized');
      }
      const parsedBody = storeIdParamSchema.safeParse(req.params);
      if (!parsedBody.success) throw parsedBody.error;

      const { storeId } = parsedBody.data;

      const store = await this.storeService.userLikeRegister(userId, storeId);

      return res.status(201).json(store);
    } catch (err) {
      next(err);
    }
  };

  userLikeUnregister = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError(401, '인증이 필요합니다.', 'Unauthorized');
      }

      const parsedBody = storeIdParamSchema.safeParse(req.params);
      if (!parsedBody.success) throw parsedBody.error;

      const { storeId } = parsedBody.data;
      await this.storeService.userLikeUnregister(userId, storeId);

      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}
