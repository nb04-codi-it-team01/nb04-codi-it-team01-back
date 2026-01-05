import { AppError } from '../../shared/middleware/error-handler';
import {
  toCartItemDetailResponse,
  toCartItemResponseDto,
  toCartResponseDto,
  toCartResponseDtoWithItems,
} from './cart.mapper';
import { CartRepository } from './cart.repository';
import { CartItemBody } from './cart.schema';

export class CartService {
  constructor(private readonly cartRepository: CartRepository) {}

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
    const cart = await this.getCartAndVerifyOwner(userId);

    const updatedItems = await this.cartRepository.updateCart(cart.id, body);

    return updatedItems.map(toCartItemResponseDto);
  }

  async deleteCartItem(userId: string, cartItemId: string) {
    const cartItem = await this.cartRepository.findByCartItemId(cartItemId);

    this.verifyItemAccess(cartItem, userId);

    await this.cartRepository.deleteCartItem(cartItemId);
  }

  async getCartItem(userId: string, cartItemId: string) {
    const cartItem = await this.cartRepository.findCartItemDetail(cartItemId);

    const validItem = this.verifyItemAccess(cartItem, userId);

    return toCartItemDetailResponse(validItem);
  }

  /**
   * 장바구니 조회 및 본인 확인
   */
  private async getCartAndVerifyOwner(userId: string) {
    const cart = await this.cartRepository.findCartByUserId(userId);

    if (!cart) {
      throw new AppError(404, '장바구니를 찾을 수 없습니다.');
    }
    if (cart.buyerId !== userId) {
      throw new AppError(403, '권한이 없습니다.');
    }

    return cart;
  }

  /**
   * 장바구니 아이템 접근 권한 확인 (존재 여부  소유주 확인)
   * Generic T를 사용하여 findByCartItemId와 findCartItemDetail의 리턴 타입을 모두 수용
   */
  private verifyItemAccess<T extends { cart: { buyerId: string } }>(
    item: T | null,
    userId: string,
  ): T {
    if (!item) {
      throw new AppError(404, '장바구니에 아이템이 없습니다.');
    }

    if (item.cart.buyerId !== userId) {
      throw new AppError(403, '권한이 없습니다.');
    }

    return item;
  }
}
