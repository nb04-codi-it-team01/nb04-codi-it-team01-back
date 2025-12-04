import type { RequestHandler } from 'express';
import {
  CreateProductBody,
  createProductSchema,
  productIdParamSchema,
  UpdateProductBody,
  updateProductSchema,
} from './product.schema';
import { ProductService } from './product.service';
import { AppError } from '../../shared/middleware/error-handler';

export class ProductController {
  constructor(private readonly productService = new ProductService()) {}

  createProduct: RequestHandler = async (req, res) => {
    const user = req.user;
    if (!user) {
      throw new AppError(401, '인증이 필요합니다.', 'Unauthorized');
    }
    const parsed = createProductSchema.safeParse(req.body);
    if (!parsed.success) {
      throw parsed.error;
    }
    const body: CreateProductBody = parsed.data;

    const product = await this.productService.createProduct(body, user.id);
    return res.status(201).json(product);
  };

  updateProduct: RequestHandler = async (req, res) => {
    const user = req.user;
    if (!user) {
      throw new AppError(401, '인증이 필요합니다.', 'Unauthorized');
    }
    const parsed = updateProductSchema.safeParse(req.body);
    if (!parsed.success) {
      throw parsed.error;
    }
    const body: UpdateProductBody = parsed.data;

    const product = await this.productService.updateProduct(body, user.id);
    return res.status(200).json(product);
  };

  deleteProduct: RequestHandler = async (req, res) => {
    const user = req.user;

    if (!user) {
      throw new AppError(401, '인증이 필요합니다.', 'Unauthorized');
    }

    const parsed = productIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      throw parsed.error;
    }

    const { productId } = parsed.data;

    await this.productService.deleteProduct(productId, {
      id: user.id,
      type: user.type,
    });

    return res.status(204).send();
  };
}
