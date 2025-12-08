import type { RequestHandler } from 'express';
import {
  CreateProductBody,
  createProductSchema,
  getProductsQuerySchema,
  productIdParamSchema,
  UpdateProductBody,
  updateProductBodySchema,
} from './product.schema';
import { ProductService } from './product.service';
import { AppError } from '../../shared/middleware/error-handler';
import { UpdateProductDto } from './product.dto';

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

  updateProduct: RequestHandler<{ productId: string }> = async (req, res) => {
    const user = req.user;
    const { productId } = req.params;
    if (!user) {
      throw new AppError(401, '인증이 필요합니다.', 'Unauthorized');
    }
    const parsed = updateProductBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw parsed.error;
    }
    const body: UpdateProductBody = parsed.data;

    if (!productId) {
      throw new AppError(404, '상품이 존재하지 않습니다.');
    }
    const dto: UpdateProductDto = {
      id: productId,
      ...body,
    };

    const product = await this.productService.updateProduct(dto, user.id);
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

  getProducts: RequestHandler = async (req, res) => {
    const query = getProductsQuerySchema.parse(req.query);
    const result = await this.productService.getProducts(query);
    return res.status(200).json(result);
  };

  getProductDetail: RequestHandler = async (req, res) => {
    const parsed = productIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      throw parsed.error;
    }

    const { productId } = parsed.data;

    const detail = await this.productService.getProductDetail(productId);

    return res.status(200).json(detail);
  };
}
