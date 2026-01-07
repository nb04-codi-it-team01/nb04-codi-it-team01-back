import { NotificationService } from '../../../src/features/notification/notification.service';
import { NotificationRepository } from '../../../src/features/notification/notification.repository';
import { AppError } from '../../../src/shared/middleware/error-handler';

describe('NotificationService', () => {
  let service: NotificationService;

  const mockNotificationRepository = {
    findProduct: jest.fn(),
    findUsersWithProductInCart: jest.fn(),
    createSoldOutNotifications: jest.fn(),
    createNotification: jest.fn(),
    findUnsent: jest.fn(),
    markAsSent: jest.fn(),
    findNotifications: jest.fn(),
    countUnchecked: jest.fn(),
    findByAlarmId: jest.fn(),
    update: jest.fn(),
  };

  const MOCK_USER_ID = 'user-1';
  const NOW = new Date();

  beforeEach(() => {
    service = new NotificationService(
      mockNotificationRepository as unknown as NotificationRepository,
    );
    jest.clearAllMocks();
  });

  describe('createSoldOutNotification', () => {
    it('판매자와 장바구니에 담은 유저들에게 품절 알림을 생성', async () => {
      // 1. 모킹 데이터 설정
      const mockProduct = {
        name: '테스트 상의',
        store: { userId: 'seller-1' },
        stocks: [{ size: { ko: 'L' } }],
      };
      const mockCartUsers = [
        { cart: { buyerId: 'buyer-1' } },
        { cart: { buyerId: 'buyer-2' } },
        { cart: { buyerId: 'buyer-1' } }, // 중복 유저
      ];

      mockNotificationRepository.findProduct.mockResolvedValue(mockProduct);
      mockNotificationRepository.findUsersWithProductInCart.mockResolvedValue(mockCartUsers);

      // 2. 실행
      await service.createSoldOutNotification([{ productId: 'p1', sizeId: 1 }]);

      // 3. 검증: 중복 제거 확인 (seller-1, buyer-1, buyer-2 총 3명)
      const expectedIds = ['seller-1', 'buyer-1', 'buyer-2'];
      const expectedContent = '테스트 상의 상품의 L 사이즈가 품절 되었습니다.';

      expect(mockNotificationRepository.createSoldOutNotifications).toHaveBeenCalledWith(
        expect.arrayContaining(expectedIds),
        expectedContent,
      );
    });

    it('상품 정보가 부족하면 에러 로그를 남기고 알림 생성을 건너뛰어야 한다', async () => {
      mockNotificationRepository.findProduct.mockResolvedValue(null);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await service.createSoldOutNotification([{ productId: 'p1', sizeId: 1 }]);

      expect(consoleSpy).toHaveBeenCalledWith('알람 생성 실패');
      expect(mockNotificationRepository.createSoldOutNotifications).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('createNotification', () => {
    it('문의(INQUIRY) 타입 알림을 올바른 메시지로 생성해야 한다', async () => {
      await service.createNotification(MOCK_USER_ID, '상품A', 'INQUIRY');

      expect(mockNotificationRepository.createNotification).toHaveBeenCalledWith(
        MOCK_USER_ID,
        '상품A 상품에 새로운 문의가 생겼습니다.',
      );
    });

    it('답변(REPLY) 타입 알림을 올바른 메시지로 생성해야 한다', async () => {
      await service.createNotification(MOCK_USER_ID, '상품B', 'REPLY');

      expect(mockNotificationRepository.createNotification).toHaveBeenCalledWith(
        MOCK_USER_ID,
        '문의하신 상품B 상품에 대한 답변이 등록되었습니다.',
      );
    });
  });

  describe('getNewNotifications', () => {
    it('새 알림을 조회하고 즉시 전송 완료(isSent) 처리', async () => {
      const mockUnsent = [
        { id: 'n1', content: '알림1', createdAt: NOW },
        { id: 'n2', content: '알림2', createdAt: NOW },
      ];
      mockNotificationRepository.findUnsent.mockResolvedValue(mockUnsent);

      const result = await service.getNewNotifications(MOCK_USER_ID);

      expect(mockNotificationRepository.markAsSent).toHaveBeenCalledWith(['n1', 'n2']);
      expect(result).toHaveLength(2);
    });
  });

  describe('getNotifications', () => {
    it('페이지네이션된 알림 목록(isSent 제외)과 전체 개수를 반환해야 한다', async () => {
      // isSent가 포함된 가짜 데이터 설정 (매퍼 로직 실행을 위함)
      const mockNotifications = [
        { id: 'n1', content: '알림1', isSent: true, isChecked: false, createdAt: new Date() },
        { id: 'n2', content: '알림2', isSent: false, isChecked: false, createdAt: new Date() },
      ];

      mockNotificationRepository.findNotifications.mockResolvedValue(mockNotifications);
      mockNotificationRepository.countUnchecked.mockResolvedValue(10);

      const result = await service.getNotifications(MOCK_USER_ID, 2, 10);

      // 페이지네이션 계산 확인
      expect(mockNotificationRepository.findNotifications).toHaveBeenCalledWith(
        MOCK_USER_ID,
        10,
        10,
      );

      // 검증: 매퍼 로직 확인 (isSent가 제거되었는지)
      result.list.forEach((item, index) => {
        const { isSent, ...expected } = mockNotifications[index];
        expect(item).toEqual(expected);
        expect('isSent' in item).toBe(false);
      });
      expect(result.totalCount).toBe(10);
    });
  });

  describe('markAsRead', () => {
    it('알림이 존재하지 않으면 404 에러를 던져야 한다', async () => {
      mockNotificationRepository.findByAlarmId.mockResolvedValue(null);

      await expect(service.markAsRead(MOCK_USER_ID, 'alarm-1')).rejects.toThrow(
        new AppError(404, '알림을 찾을 수 없습니다.'),
      );
    });

    it('자신의 알림이 아니면 403 에러를 던져야 한다', async () => {
      mockNotificationRepository.findByAlarmId.mockResolvedValue({
        userId: 'other-user',
      });

      await expect(service.markAsRead(MOCK_USER_ID, 'alarm-1')).rejects.toThrow(
        new AppError(403, '접근 권한이 없습니다.'),
      );
    });

    it('알림을 읽음 처리(isChecked: true)', async () => {
      const mockResult = { id: 'a1', userId: MOCK_USER_ID, isSent: true, content: 'hi' };
      mockNotificationRepository.findByAlarmId.mockResolvedValue({ userId: MOCK_USER_ID });
      mockNotificationRepository.update.mockResolvedValue(mockResult);

      const result = await service.markAsRead(MOCK_USER_ID, 'a1');

      const { isSent, ...expectedRest } = mockResult;

      expect(result).toEqual(expectedRest);
      expect('isSent' in result).toBe(false);
    });
  });
});
