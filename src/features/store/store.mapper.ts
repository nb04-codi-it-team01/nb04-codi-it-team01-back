// store.mapper.ts
import { Store } from '@prisma/client';
import { StoreResponseDto } from './store.dto';

export function mapStoreToResponse(store: Store): StoreResponseDto {
  return {
    id: store.id,
    name: store.name,
    createdAt: store.createdAt.toISOString(),
    updatedAt: store.updatedAt.toISOString(),
    userId: store.userId,
    address: store.address,
    detailAddress: store.detailAddress ?? '',
    phoneNumber: store.phoneNumber,
    content: store.content,
    image: store.image ?? '',
  };
}
