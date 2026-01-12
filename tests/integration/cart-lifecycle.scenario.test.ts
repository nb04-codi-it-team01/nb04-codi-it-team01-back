import request from 'supertest';
import { app } from '../../src/app';
import { clearDatabase, disconnectDatabase, seedTestDatabase } from '../helpers/test-db';
import { testUsers } from '../helpers/test-fixtures';
import { CartResponseDto, UpdateCartDto } from '../../src/features/cart/cart.dto';
import prisma from '../../src/lib/prisma';

/**
 * 시나리오: 장바구니
 * 1. 구매자 & 판매자 회원가입 및 로그인
 * 2. 판매자가 스토어 및 상품 등록 (DB 직접 생성으로 기초 데이터 준비)
 * 3. 구매자가 본인의 장바구니를 생성 (POST /api/cart API 사용)
 * 4. 장바구니에 상품 및 수량 추가 (PATCH /api/cart)
 * 5. 장바구니에 상품 및 수량 수정 (PATCH /api/cart)
 * 6. 장바구니 목록 및 상세 정보 확인 (GET /api/cart)
 * 7. 장바구니 아이템 삭제 및 삭제 여부 검증 (DELETE /api/cart/:id)
 */

describe('장바구니 시나리오', () => {
  let sellerToken: string;
  let buyerToken: string;
  let sellerId: string;
  let buyerId: string;
  let storeId: string;
  let productId: string;
  let cartItemId: string;
  let sizeId: number;

  beforeAll(async () => {
    await clearDatabase();
    await seedTestDatabase();
  });

  afterAll(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  it('1. 판매자 & 구매자 회원가입 및 로그인', async () => {
    const sSignup = await request(app).post('/api/users').send(testUsers.seller);
    sellerId = sSignup.body.id;
    const sLogin = await request(app).post('/api/auth/login').send({
      email: testUsers.seller.email,
      password: testUsers.seller.password,
    });
    sellerToken = sLogin.body.accessToken;

    const bSignup = await request(app).post('/api/users').send(testUsers.buyer);
    buyerId = bSignup.body.id;
    const bLogin = await request(app).post('/api/auth/login').send({
      email: testUsers.buyer.email,
      password: testUsers.buyer.password,
    });
    buyerToken = bLogin.body.accessToken;
  });

  it('2. 스토어, 사이즈, 상품 데이터 생성', async () => {
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

    const size = await prisma.size.create({
      data: { en: 'L', ko: '라지' },
    });
    sizeId = size.id;

    const product = await prisma.product.create({
      data: {
        name: '테스트 상품',
        content: '장바구니 테스트용 상품입니다',
        price: 10000,
        categoryName: 'TOP',
        storeId: storeId,
        stocks: {
          create: { sizeId: sizeId, quantity: 100 },
        },
      },
    });
    productId = product.id;
  });

  it('3. 구매자가 빈 장바구니를 생성한다 ', async () => {
    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send();

    expect(res.status).toBe(201);
  });

  it('4. 구매자가 상품을 장바구니에 담는다', async () => {
    const res = await request(app)
      .patch('/api/cart')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        productId,
        quantity: 3,
        sizes: [{ sizeId: sizeId, quantity: 3 }],
      });

    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);

    if (res.body.length > 0) {
      cartItemId = res.body[0].id;
    }
    expect(cartItemId).toBeDefined();
  });

  it('5. 장바구니에 담긴 상품의 수량을 수정한다 (3개 -> 5개)', async () => {
    const res = await request(app)
      .patch('/api/cart')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        productId,
        quantity: 5,
        sizes: [{ sizeId: sizeId, quantity: 5 }],
      });

    expect(res.status).toBe(200);

    const items = res.body as UpdateCartDto[];

    const updatedItem = items.find((item) => item.id === cartItemId);

    expect(updatedItem).toBeDefined();
    expect(updatedItem?.quantity).toBe(5);
  });

  it('6. 장바구니 목록 및 상세 정보를 조회한다', async () => {
    const listRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.items).toContainEqual(expect.objectContaining({ id: cartItemId }));

    const detailRes = await request(app)
      .get(`/api/cart/${cartItemId}`)
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.id).toBe(cartItemId);
    expect(detailRes.body.product.name).toBe('테스트 상품');
  });

  it('7. 장바구니에서 상품을 삭제한다', async () => {
    const deleteRes = await request(app)
      .delete(`/api/cart/${cartItemId}`)
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(deleteRes.status).toBe(204);

    const checkRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${buyerToken}`);

    const cartData = checkRes.body as CartResponseDto;

    const itemIds = cartData.items.map((item) => item.id);
    expect(itemIds).not.toContain(cartItemId);

    const detailRes = await request(app)
      .get(`/api/cart/${cartItemId}`)
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(detailRes.status).toBe(404);
  });
});
