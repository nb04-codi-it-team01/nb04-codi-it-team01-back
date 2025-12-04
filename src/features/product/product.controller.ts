import type { RequestHandler } from 'express';
import { CreateProductBody, UpdateProductBody } from './product.schema';
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

    const body = req.body as CreateProductBody;

    const product = await this.productService.createProduct(body, sellerUserId);
    return res.status(201).json(product);
  };

  updateProduct: RequestHandler = async (req, res) => {
    const user = req.user;
    if (!user) {
      throw new AppError(401, '인증이 필요합니다.', 'Unauthorized');
    }

    const sellerUserId = user.id;

    const body = req.body as UpdateProductBody;

    const product = await this.productService.updateProduct(body, sellerUserId);
    return res.status(200).json(product);
  };

  deleteProduct: RequestHandler = async (req, res) => {
    const { productId } = req.params;
    const user = req.user;

    if (!user) {
      throw new AppError(404, '존재하지 않는 유저입니다.');
    }

    if (!productId) {
      throw new AppError(404, '존재하지 않는 상품입니다.');
    }

    await this.productService.deleteProduct(productId, {
      id: user.id,
      type: user.type,
    });

    return res.status(204).send();
  };
}
