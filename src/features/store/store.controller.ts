import { Request, Response, NextFunction } from 'express';
import { storeService } from './store.service';

export class StoreController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { name, address, detailAddress, phoneNumber, content, image } = req.body;

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const store = await storeService.create(userId, {
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
  }
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { name, address, detailAddress, phoneNumber, content, image } = req.body;

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const store = await storeService.update(userId, {
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
  }

  async getStoreDetail(req: Request, res: Response, next: NextFunction) {
    const storeId = req.params.storeId!;

    const store = await storeService.getStoreDetail(storeId);

    return res.status(200).json(store);
  }
}
