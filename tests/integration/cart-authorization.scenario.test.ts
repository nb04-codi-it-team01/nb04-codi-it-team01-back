import request from 'supertest';
import { app } from '../../src/app';
import { clearDatabase, disconnectDatabase, seedTestDatabase } from '../helpers/test-db';
import { testUsers } from '../helpers/test-fixtures';
import prisma from '../../src/lib/prisma';
import { UpdateCartDto } from '../../src/features/cart/cart.dto';

/**
 * 시나리오: 장바구니 권한 검증
 * 1. 테스트 유저 가입 및 데이터 준비: 판매자, 구매자A, 구매자B 계정을 생성하고 각각의 토큰을 확보한다.
 * 2. 데이터 생성: 판매자가 상품을 등록하고, 구매자A가 이를 장바구니에 담아 '구매자A의 아이템 ID'를 생성한다.
 * 3. 판매자(Seller) 권한으로 장바구니 API 호출 시 403 Forbidden이 발생하는지 확인한다.
 * 4. 구매자B가 구매자A의 아이템 ID를 이용해 상세 조회를 시도할 때 403 Forbidden이 발생하는지 확인한다.
 * 5. 구매자B가 구매자A의 아이템 ID를 이용해 삭제를 시도할 때 403 Forbidden이 발생하는지 확인한다.
 * 6. 인증 여부 검증: 로그인하지 않은(토큰이 없는) 사용자가 접근할 때 401 Unauthorized가 발생하는지 확인한다.
 */

describe('장바구니 권한 검증 시나리오', () => {
  let sellerToken: string;
  let buyerAToken: string;
  let buyerBToken: string;
  let sellerId: string;
  let storeId: string;
  let productId: string;
  let sizeId: number;
  let cartItemIdA: string;

  beforeAll(async () => {
    await clearDatabase();
    await seedTestDatabase();
  });

  afterAll(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  it('1. 테스트 유저 가입 및 데이터 준비 (판매자, 구매자A, 구매자B)', async () => {
    // 판매자 준비
    const sSignup = await request(app).post('/api/users').send(testUsers.seller);
    sellerId = sSignup.body.id;
    const sLogin = await request(app).post('/api/auth/login').send({
      email: testUsers.seller.email,
      password: testUsers.seller.password,
    });
    sellerToken = sLogin.body.accessToken;

    // 구매자 A 준비
    await request(app).post('/api/users').send(testUsers.buyer);
    const aLogin = await request(app).post('/api/auth/login').send({
      email: testUsers.buyer.email,
      password: testUsers.buyer.password,
    });
    buyerAToken = aLogin.body.accessToken;

    // 구매자 B 준비
    await request(app).post('/api/users').send(testUsers.anotherBuyer);
    const bLogin = await request(app).post('/api/auth/login').send({
      email: testUsers.anotherBuyer.email,
      password: testUsers.anotherBuyer.password,
    });
    buyerBToken = bLogin.body.accessToken;
  });

  it('2. 판매자가 상품을 등록하고 구매자A가 장바구니에 담는다', async () => {
    const store = await prisma.store.create({
      data: {
        name: '장바구니 테스트 스토어',
        address: '서울시 강남구',
        phoneNumber: '02-1234-5678',
        content: '테스트용 스토어입니다',
        userId: sellerId,
      },
    });
    storeId = store.id;

    const size = await prisma.size.create({ data: { en: 'M', ko: '미디움' } });
    sizeId = size.id;

    const product = await prisma.product.create({
      data: {
        name: '권한 테스트 상품',
        price: 15000,
        categoryName: 'TOP',
        storeId: storeId,
        stocks: { create: { sizeId: sizeId, quantity: 50 } },
      },
    });
    productId = product.id;

    // 구매자 A 장바구니 생성 및 담기
    await request(app).post('/api/cart').set('Authorization', `Bearer ${buyerAToken}`).send();

    const patchRes = await request(app)
      .patch('/api/cart')
      .set('Authorization', `Bearer ${buyerAToken}`)
      .send({
        productId,
        quantity: 2,
        sizes: [{ sizeId, quantity: 2 }],
      });

    const items = patchRes.body as UpdateCartDto[];
    cartItemIdA = items[0].id; // 구매자 A의 아이템 ID 확보
    expect(cartItemIdA).toBeDefined();
  });

  it('3. 판매자는 장바구니 기능을 사용할 수 없다 (403)', async () => {
    const res = await request(app).get('/api/cart').set('Authorization', `Bearer ${sellerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('구매자만');
  });

  it('4. 구매자B가 구매자A의 아이템 상세 조회를 시도하면 실패한다 (403)', async () => {
    const res = await request(app)
      .get(`/api/cart/${cartItemIdA}`)
      .set('Authorization', `Bearer ${buyerBToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('권한이 없습니다');
  });

  it('5. 구매자B가 구매자A의 아이템 삭제를 시도하면 실패한다 (403)', async () => {
    const res = await request(app)
      .delete(`/api/cart/${cartItemIdA}`)
      .set('Authorization', `Bearer ${buyerBToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('권한이 없습니다');
  });

  it('6. 로그인하지 않은 사용자는 장바구니에 접근할 수 없다 (401)', async () => {
    const res = await request(app).get('/api/cart');

    expect(res.status).toBe(401);
  });
});
