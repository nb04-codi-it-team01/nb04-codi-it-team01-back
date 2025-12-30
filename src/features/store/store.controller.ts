import { RequestHandler } from 'express';
import { StoreService } from './store.service';
import {
  getMyProductsQuerySchema,
  createStoreBody,
  updateStoreBody,
  storeIdParam,
} from './store.schema';

export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  create: RequestHandler = async (req, res) => {
    const user = req.user!;
    const body = req.body as createStoreBody;

    const store = await this.storeService.create(user.id, user.type, body);

    return res.status(201).json(store);
  };

  update: RequestHandler = async (req, res) => {
    const user = req.user!;
    const { storeId } = req.params as storeIdParam;

    const body = req.body as updateStoreBody;

    const store = await this.storeService.update(user.id, storeId, body);

    return res.status(200).json(store);
  };

  getStoreDetail: RequestHandler = async (req, res) => {
    const { storeId } = req.params as storeIdParam;

    const store = await this.storeService.getStoreDetail(storeId);

    return res.status(200).json(store);
  };

  getMyStoreDetail: RequestHandler = async (req, res) => {
    const user = req.user!;

    const store = await this.storeService.getMyStoreDetail(user.id);

    return res.status(200).json(store);
  };

  getMyProducts: RequestHandler = async (req, res) => {
    const user = req.user!;
    const { page, pageSize } = getMyProductsQuerySchema.parse(req.query);

    const data = await this.storeService.getMyProducts(user.id, page, pageSize);

    res.json(data);
  };

  userLikeRegister: RequestHandler = async (req, res) => {
    const user = req.user!;
    const { storeId } = req.params as storeIdParam;

    const store = await this.storeService.userLikeRegister(user.id, storeId);

    return res.status(201).json(store);
  };

  userLikeUnregister: RequestHandler = async (req, res) => {
    const user = req.user!;
    const { storeId } = req.params as storeIdParam;

    await this.storeService.userLikeUnregister(user.id, storeId);

    return res.status(204).send();
  };
}
