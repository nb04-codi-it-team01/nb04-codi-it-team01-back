import { AppError } from '../../shared/middleware/error-handler';
import { UserType } from '../../shared/types/auth';
import {
  toCartItemDetailResponse,
  toCartItemResponseDto,
  toCartResponseDto,
  toCartResponseDtoWithItems,
} from './cart.mapper';
import { CartRepository } from './cart.repository';
import { CartItemBody } from './cart.schema';

export class CartService {
  constructor(private readonly cartRepository = new CartRepository()) {}

  async createCart(userId: string) {
    let cart = await this.cartRepository.findCartByUserId(userId);

    if (!cart) {
      cart = await this.cartRepository.createCart(userId);
    }

    return toCartResponseDto(cart);
  }

  async getCart(userId: string) {
    const cart = await this.cartRepository.upsertCart(userId);

    return toCartResponseDtoWithItems(cart);
  }

  async updateCart(userId: string, body: CartItemBody) {
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

  async deleteCartItem(userId: string, cartItemId: string) {
    const cartItem = await this.cartRepository.findByCartItemId(cartItemId);

    if (!cartItem) {
      throw new AppError(404, '장바구니에 아이템이 없습니다.');
    }

    if (cartItem.cart.buyerId !== userId) {
      throw new AppError(403, '권한이 없습니다.');
    }

    await this.cartRepository.deleteCartItem(cartItemId);
  }

  async getCartItem(userId: string, cartItemId: string) {
    const cartItem = await this.cartRepository.findCartItemDetail(cartItemId);

    if (!cartItem) {
      throw new AppError(404, '장바구니에 아이템이 없습니다.');
    }

    if (cartItem.cart.buyerId !== userId) {
      throw new AppError(403, '권한이 없습니다.');
    }

    return toCartItemDetailResponse(cartItem);
  }
}
