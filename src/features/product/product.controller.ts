import type { RequestHandler } from 'express';
import { ProductService } from './product.service';
import {
  createProductInquirySchema,
  createProductSchema,
  getProductsQuerySchema,
  productIdParamSchema,
  updateProductBodySchema,
} from './product.schema';
import { UpdateProductDto } from './product.dto';

export class ProductController {
  constructor(private readonly productService = new ProductService()) {}

  /** 상품 생성 */
  createProduct: RequestHandler = async (req, res) => {
    const user = req.user!;

    const body = createProductSchema.parse(req.body);

    const product = await this.productService.createProduct(body, user.id);
    return res.status(201).json(product);
  };

  /** 상품 수정 */
  updateProduct: RequestHandler = async (req, res) => {
    const user = req.user!;

    const { productId } = productIdParamSchema.parse(req.params);

    const body = updateProductBodySchema.parse(req.body);

    const dto: UpdateProductDto = {
      id: productId,
      ...body,
    };

    const product = await this.productService.updateProduct(dto, user.id);
    return res.status(200).json(product);
  };

  /** 상품 삭제 */
  deleteProduct: RequestHandler = async (req, res) => {
    const user = req.user!;

    const { productId } = productIdParamSchema.parse(req.params);

    await this.productService.deleteProduct(productId, {
      id: user.id,
      type: user.type,
    });

    return res.status(204).send();
  };

  /** 상품 목록 조회 */
  getProducts: RequestHandler = async (req, res) => {
    const query = getProductsQuerySchema.parse(req.query);

    const result = await this.productService.getProducts(query);
    return res.status(200).json(result);
  };

  /** 상품 상세 조회 */
  getProductDetail: RequestHandler = async (req, res) => {
    const { productId } = productIdParamSchema.parse(req.params);
    const detail = await this.productService.getProductDetail(productId);
    return res.status(200).json(detail);
  };

  /** 상품 문의 등록 */
  createProductInquiry: RequestHandler = async (req, res) => {
    const user = req.user!;

    const { productId } = productIdParamSchema.parse(req.params);
    const body = createProductInquirySchema.parse(req.body);

    const product = await this.productService.createProductInquiry(user.id, productId, body);
    return res.status(201).json(product);
  };

  /** 상품 문의 목록 조회 */
  getProductInquiries: RequestHandler = async (req, res) => {
    const { productId } = productIdParamSchema.parse(req.params);
    const userId = req.user?.id;

    const inquiries = await this.productService.getProductInquiries(productId, userId);
    return res.status(200).json(inquiries);
  };
}
