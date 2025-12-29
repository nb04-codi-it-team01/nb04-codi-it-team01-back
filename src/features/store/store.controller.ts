import { RequestHandler } from 'express';
import { StoreService } from './store.service';
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

  create: RequestHandler = async (req, res) => {
    const parsed = createStoreBodySchema.safeParse(req.body);
    if (!parsed.success) throw parsed.error;

    const body: createStoreBody = parsed.data;
    const store = await this.storeService.create(req.user!.id, req.user!.type, body);
    return res.status(201).json(store);
  };

  update: RequestHandler = async (req, res) => {
    const parsedId = storeIdParamSchema.safeParse(req.params);
    if (!parsedId.success) throw parsedId.error;

    const { storeId } = parsedId.data;

    const parsedBody = updateStoreBodySchema.safeParse(req.body);
    if (!parsedBody.success) throw parsedBody.error;

    const body: updateStoreBody = parsedBody.data;
    const store = await this.storeService.update(req.user!.id, storeId, body);
    return res.status(200).json(store);
  };

  getStoreDetail: RequestHandler = async (req, res) => {
    const parsedBody = storeIdParamSchema.safeParse(req.params);
    if (!parsedBody.success) throw parsedBody.error;

    const { storeId } = parsedBody.data;
    const store = await this.storeService.getStoreDetail(storeId);
    return res.status(200).json(store);
  };

  getMyStoreDetail: RequestHandler = async (req, res) => {
    const store = await this.storeService.getMyStoreDetail(req.user!.id);
    return res.status(200).json(store);
  };

  getMyProducts: RequestHandler = async (req, res) => {
    const parsed = getMyProductsQuerySchema.safeParse(req.query);
    if (!parsed.success) throw parsed.error;

    const { page, pageSize } = parsed.data;
    const data = await this.storeService.getMyProducts(req.user!.id, page, pageSize);
    res.json(data);
  };

  userLikeRegister: RequestHandler = async (req, res) => {
    const parsedBody = storeIdParamSchema.safeParse(req.params);
    if (!parsedBody.success) throw parsedBody.error;

    const { storeId } = parsedBody.data;
    const store = await this.storeService.userLikeRegister(req.user!.id, storeId);
    return res.status(201).json(store);
  };

  userLikeUnregister: RequestHandler = async (req, res) => {
    const parsedBody = storeIdParamSchema.safeParse(req.params);
    if (!parsedBody.success) throw parsedBody.error;

    const { storeId } = parsedBody.data;
    await this.storeService.userLikeUnregister(req.user!.id, storeId);
    return res.status(204).send();
  };
}
