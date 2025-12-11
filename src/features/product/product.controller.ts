import type { RequestHandler } from 'express';
import { ProductService } from './product.service';
import {
  CreateProductBody,
  CreateProductInquiryBody,
  GetProductsQuery,
  UpdateProductBody,
} from './product.schema';
import { UpdateProductDto } from './product.dto';

export class ProductController {
  constructor(private readonly productService = new ProductService()) {}

  createProduct: RequestHandler = async (req, res) => {
    const user = req.user!;

    const body = req.body as CreateProductBody;

    const product = await this.productService.createProduct(body, user.id);
    return res.status(201).json(product);
  };

  updateProduct: RequestHandler = async (req, res) => {
    const user = req.user!;

    const { productId } = req.params as { productId: string };
    const body = req.body as UpdateProductBody;

    const dto: UpdateProductDto = {
      id: productId,
      ...body,
    };

    const product = await this.productService.updateProduct(dto, user.id);
    return res.status(200).json(product);
  };

  deleteProduct: RequestHandler = async (req, res) => {
    const user = req.user!;
    const { productId } = req.params as { productId: string };

    await this.productService.deleteProduct(productId, {
      id: user.id,
      type: user.type,
    });

    return res.status(204).send();
  };

  getProducts: RequestHandler = async (req, res) => {
    const query = req.query as unknown as GetProductsQuery;

    const result = await this.productService.getProducts(query);
    return res.status(200).json(result);
  };

  getProductDetail: RequestHandler = async (req, res) => {
    const { productId } = req.params as { productId: string };
    const detail = await this.productService.getProductDetail(productId);
    return res.status(200).json(detail);
  };

  createProductInquiry: RequestHandler = async (req, res) => {
    const user = req.user!;
    const { productId } = req.params as { productId: string };
    const body = req.body as CreateProductInquiryBody;

    const product = await this.productService.createProductInquiry(user.id, productId, body);
    return res.status(201).json(product);
  };

  getProductInquiries: RequestHandler = async (req, res) => {
    const { productId } = req.params as { productId: string };
    const userId = req.user?.id;

    const inquiries = await this.productService.getProductInquiries(productId, userId);
    return res.status(200).json(inquiries);
  };
}
