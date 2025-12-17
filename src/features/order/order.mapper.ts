import type { OrderItemDto, OrderResponseDto } from './order.dto';
import { OrderWithRelations, OrderItemWithRelations } from './order.type';

export class OrderMapper {
  static toOrderItemDto(item: OrderItemWithRelations): OrderItemDto {
    const product = item.product!;
    const store = product.store!;

    return {
      id: item.id,
      price: product.price,
      quantity: item.quantity,
      productId: item.productId!,
      isReviewed: item.isReviewed,

      product: {
        id: product.id,
        storeId: product.storeId!,
        name: product.name,
        price: product.price,
        image: product.image ?? '',
        discountRate: product.discountRate,
        discountStartTime: product.discountStartTime?.toISOString() ?? '',
        discountEndTime: product.discountEndTime?.toISOString() ?? '',
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),

        store: {
          id: store.id,
          userId: store.userId,
          name: store.name,
          address: store.address,
          phoneNumber: store.phoneNumber,
          content: store.content ?? '',
          image: store.image ?? '',
          createdAt: store.createdAt.toISOString(),
          updatedAt: store.updatedAt.toISOString(),
        },

        stocks: product.stocks.map((s) => ({
          id: s.id,
          productId: s.productId!,
          sizeId: s.sizeId,
          quantity: s.quantity,
          size: {
            id: s.size.id,
            size: {
              en: s.size.en,
              ko: s.size.ko,
            },
          },
        })),
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
      orderItems: order.orderItems.map(OrderMapper.toOrderItemDto),
      payments: order.payment
        ? {
            id: order.payment.id,
            price: order.payment.price,
            status: order.payment.status,
            createdAt: order.payment.createdAt.toISOString(),
            updatedAt: order.payment.updatedAt.toISOString(),
            orderId: order.payment.orderId!,
          }
        : null,
    };
  }
}
