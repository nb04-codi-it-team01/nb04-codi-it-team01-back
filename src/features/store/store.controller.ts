import { Request, Response, NextFunction } from 'express';
import { StoreService } from './store.service';

export class StoreController {
  constructor(private readonly storeService = new StoreService()) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.type;
      const { name, address, detailAddress, phoneNumber, content, image } = req.body;

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (!userType) {
        return res.status(403).json({ message: '권한 정보가 없습니다.' });
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
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (!storeId) {
        return res.status(400).json({ message: 'storeId가 필요합니다.' });
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
    const storeId = req.params.storeId;

    if (!storeId) {
      return res.status(400).json({ message: 'storeId가 필요합니다.' });
    }

    const store = await this.storeService.getStoreDetail(storeId);

    return res.status(200).json(store);
  };

  getMyStoreDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const store = await this.storeService.getMyStoreDetail(userId);

      return res.status(200).json(store);
    } catch (err) {
      next(err);
    }
  };
}
