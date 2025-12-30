import { StoreController } from './store.controller';
import { StoreRepository } from './store.repository';
import { StoreService } from './store.service';

export function createStoreController(): StoreController {
  const storeRepository = new StoreRepository();

  const storeService = new StoreService(storeRepository);

  const controller = new StoreController(storeService);

  return controller;
}
