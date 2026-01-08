import { NotificationRepository } from '../../../src/features/notification/notification.repository';
import prisma from '../../../src/lib/prisma';

jest.mock('../../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    product: { findUnique: jest.fn() },
    cartItem: { findMany: jest.fn() },
    notification: {
      createMany: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('NotificationRepository', () => {
  let repository: NotificationRepository;

  beforeEach(() => {
    repository = new NotificationRepository();
    jest.clearAllMocks();
  });

  const MOCK_USER_ID = 'user-1';
  const MOCK_PROD_ID = 'prod-123';
  const MOCK_SIZE_ID = 1;

  describe('findProduct', () => {
    it('상품 정보와 특정 사이즈의 재고를 포함하여 조회', async () => {
      await repository.findProduct(MOCK_PROD_ID, MOCK_SIZE_ID);

      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: MOCK_PROD_ID },
        include: {
          store: true,
          stocks: {
            where: { sizeId: MOCK_SIZE_ID },
            include: { size: true },
          },
        },
      });
    });
  });

  describe('findUsersWithProductInCart', () => {
    it('특정 상품과 사이즈를 장바구니에 담은 사용자 목록을 조회', async () => {
      await repository.findUsersWithProductInCart(MOCK_PROD_ID, MOCK_SIZE_ID);

      expect(prisma.cartItem.findMany).toHaveBeenCalledWith({
        where: { productId: MOCK_PROD_ID, sizeId: MOCK_SIZE_ID },
        select: { cart: { select: { buyerId: true } } },
      });
    });
  });

  describe('createSoldOutNotifications', () => {
    it('여러 사용자에게 품절 알림을 생성', async () => {
      const userIds = ['user-1', 'user-2'];
      const content = '품절되었습니다.';

      await repository.createSoldOutNotifications(userIds, content);

      expect(prisma.notification.createMany).toHaveBeenCalledWith({
        data: [
          { userId: 'user-1', content },
          { userId: 'user-2', content },
        ],
      });
    });
  });

  describe('createNotification', () => {
    it('알림 생성', async () => {
      const userId = 'user-123';
      const content = '새로운 메시지가 도착했습니다.';

      await repository.createNotification(userId, content);

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId,
          content,
        },
      });
    });
  });

  describe('findUnsent', () => {
    it('전송되지 않은 알림 조회', async () => {
      await repository.findUnsent(MOCK_USER_ID);

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: MOCK_USER_ID, isSent: false },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('markAsSent', () => {
    it('전송 상태를 true로 업데이트', async () => {
      const ids = ['alarm-1', 'alarm-2'];
      await repository.markAsSent(ids);

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ids } },
        data: { isSent: true },
      });
    });
  });

  describe('findNotifications', () => {
    it('확인하지 않은 알림을 조회', async () => {
      await repository.findNotifications(MOCK_USER_ID, 10, 5);

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: MOCK_USER_ID, isChecked: false },
        skip: 10,
        take: 5,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('countUnchecked', () => {
    it('확인하지 않은 알림의 개수 확인', async () => {
      await repository.countUnchecked(MOCK_USER_ID);

      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: MOCK_USER_ID, isChecked: false },
      });
    });
  });

  describe('findByAlarmId', () => {
    it('alarmId로 알림 조회', async () => {
      const alarmId = 'alarm-777';
      const mockNotification = {
        id: alarmId,
        userId: MOCK_USER_ID,
        content: '테스트 알림 내용',
        isChecked: false,
        isSent: true,
        createdAt: new Date(),
      };

      (prisma.notification.findUnique as jest.Mock).mockResolvedValue(mockNotification);

      const result = await repository.findByAlarmId(alarmId);

      expect(prisma.notification.findUnique).toHaveBeenCalledWith({
        where: { id: alarmId },
      });
      expect(result).toEqual(mockNotification);
    });
  });

  describe('update (isChecked)', () => {
    it('알림을 읽음 처리(isChecked: true)', async () => {
      const alarmId = 'alarm-123';
      await repository.update(alarmId);

      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: alarmId },
        data: { isChecked: true },
      });
    });
  });
});
