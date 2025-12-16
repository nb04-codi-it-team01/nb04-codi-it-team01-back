import { AppError } from '../../shared/middleware/error-handler';
import { UserType } from '../../shared/types/auth';
import {
  toCartItemResponseDto,
  toCartResponseDto,
  toCartResponseDtoWithItems,
} from './cart.mapper';
import { CartRepository } from './cart.repository';
import { AddCartItemBody } from './cart.schema';

export class CartService {
  constructor(private readonly cartRepository = new CartRepository()) {}

  async createCart(userId: string, userType: UserType) {
    if (userType !== 'BUYER') {
      throw new AppError(403, '접근 권한이 없습니다.', 'Forbidden');
    }

    let cart = await this.cartRepository.findCartByUserId(userId);

    if (!cart) {
      cart = await this.cartRepository.createCart(userId);
    }

    return toCartResponseDto(cart);
  }

  async getCart(userId: string) {
    const cart = await this.cartRepository.findCart(userId);

    if (!cart) {
      throw new AppError(404, '장바구니를 찾을 수 없습니다.');
    }

    return toCartResponseDtoWithItems(cart);
  }

  async updateCart(userId: string, body: AddCartItemBody) {
    const cart = await this.cartRepository.findCartByUserId(userId);

    if (!cart) {
      throw new AppError(404, '장바구니를 찾을 수 없습니다.');
    }

    if (cart.buyerId !== userId) {
      throw new AppError(403, '권한이 없습니다.');
    }

    const updatedItems = await this.cartRepository.updateCart(cart.id, body);

    return updatedItems.map(toCartItemResponseDto);
  }
}
