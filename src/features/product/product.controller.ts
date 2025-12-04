import type { RequestHandler } from 'express';
import type { AuthedRequest } from './product.type';
import { createProductSchema } from './products.schema';
import { ProductService } from './product.service';

export class ProductController {
  constructor(private readonly productService = new ProductService()) {}

  public createProduct: RequestHandler = async (req, res) => {
    const { user } = req as AuthedRequest;
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
}
