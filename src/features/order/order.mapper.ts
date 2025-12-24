import type { OrderItemDto, OrderResponseDto } from './order.dto';
import { OrderWithRelations, OrderItemWithRelations } from './order.type';

export class OrderMapper {
  static toOrderItemDto(item: OrderItemWithRelations): OrderItemDto {
    const name = item.product?.name ?? item.productName;
    const image = item.product?.image ?? item.productImage;

    const myReview = item.review
      ? {
          id: item.review.id,
          rating: item.review.rating,
          content: item.review.content,
          createdAt: item.review.createdAt.toISOString(),
        }
      : null;

    return {
      id: item.id,
      price: item.price,
      quantity: item.quantity,
      productId: item.productId ?? '',
      isReviewed: item.isReviewed,

      product: {
        name: name,
        image: image ?? '',
        reviews: myReview ? [myReview] : [],
      },

      size: {
        id: item.size.id,
        size: {
          en: item.size.en,
          ko: item.size.ko,
        },
      },
    };
  }

  static toOrderResponseDto(order: OrderWithRelations): OrderResponseDto {
    return {
      id: order.id,
      name: order.name,
      phoneNumber: order.phoneNumber,
      address: order.address,
      subtotal: order.subtotal,
      totalQuantity: order.totalQuantity,
      usePoint: order.usePoint,
      createdAt: order.createdAt.toISOString(),
      orderItems: order.orderItems.map((item) => OrderMapper.toOrderItemDto(item)),
      payment: order.payment
        ? {
            id: order.payment.id,
            price: order.payment.price,
            status: order.payment.status,
            createdAt: order.payment.createdAt.toISOString(),
            updatedAt: order.payment.updatedAt.toISOString(),
            orderId: order.payment.orderId ?? '',
          }
        : null,
    };
  }
}
