import type { RequestHandler } from 'express';
import { createProductSchema, updateProductSchema } from './product.schema';
import { ProductService } from './product.service';
import { AppError } from '../../shared/middleware/error-handler';

export class ProductController {
  constructor(private readonly productService = new ProductService()) {}

  createProduct: RequestHandler = async (req, res) => {
    const user = req.user;
    if (!user) {
      throw new AppError(401, '인증이 필요합니다.', 'Unauthorized');
    }

    const sellerUserId = user.id;

    const parseResult = createProductSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: '잘못된 요청입니다.',
        errors: parseResult.error.flatten(),
      });
    }

    const body = parseResult.data;

    const product = await this.productService.createProduct(body, sellerUserId);
    return res.status(201).json(product);
  };

  updateProduct: RequestHandler = async (req, res) => {
    const user = req.user;
    if (!user) {
      throw new AppError(401, '인증이 필요합니다.', 'Unauthorized');
    }

    const sellerUserId = user.id;

    const parseResult = updateProductSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: '잘못된 요청입니다.',
        errors: parseResult.error.flatten(),
      });
    }

    const body = parseResult.data;

    const product = await this.productService.updateProduct(body, sellerUserId);
    return res.status(200).json(product);
  };
}
