/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest';
import { app } from '../../src/app';
import { clearDatabase, disconnectDatabase, seedTestDatabase } from '../helpers/test-db';
import { testUsers } from '../helpers/test-fixtures';
import prisma from '../../src/lib/prisma';

/**
 * 🛒 시나리오: 상품 생애주기(Lifecycle) 및 보안 검증
 * * [등장인물]
 * - 판매자A (주인공): 정상적으로 상품을 등록, 관리하는 유저
 * - 판매자B (해커): 남의 상품을 몰래 수정/삭제하려는 악의적 유저
 * - 구매자 (대중): 상품 목록을 조회하는 유저
 * * [진행 순서]
 * 1. [등록] 판매자A가 '테스트 티셔츠'를 등록한다.
 * 2. [조회] 등록된 상품이 상세 페이지와 목록(TOP 카테고리)에 정상 노출되는지 확인한다.
 * 3. [수정] 판매자A가 상품 정보를 수정한다. (가격 인상, 이미지 변경)
 * 4. [보안] 판매자B가 판매자A의 상품을 수정하려고 시도한다. (403 차단)
 * 5. [보안] 판매자B가 판매자A의 상품을 삭제하려고 시도한다. (403 차단)
 * 6. [삭제] 판매자A가 상품을 삭제한다.
 * 7. [확인] 삭제된 상품이 더 이상 조회되지 않는지 확인한다.
 */
describe('상품 관리 및 보안 시나리오', () => {
  let sellerToken: string;
  let anotherSellerToken: string;

  let sellerId: string;
  let storeId: string;
  let productId: string;
  let sizeId: number;

  beforeAll(async () => {
    await clearDatabase();
    await seedTestDatabase();

    // 0. 기초 데이터(사이즈) 준비
    const size = await prisma.size.findFirst();
    if (!size) {
      const newSize = await prisma.size.create({ data: { en: 'FREE', ko: 'FREE' } });
      sizeId = newSize.id;
    } else {
      sizeId = size.id;
    }

    // 1. 판매자 A (주인공) 생성 & 로그인 & 스토어 개설
    const seller = await request(app).post('/api/users').send(testUsers.seller);
    sellerId = seller.body.id;

    const loginA = await request(app).post('/api/auth/login').send({
      email: testUsers.seller.email,
      password: testUsers.seller.password,
    });
    sellerToken = loginA.body.accessToken;

    const store = await prisma.store.create({
      data: {
        name: '판매자A의 스토어',
        userId: sellerId,
        address: '서울',
        phoneNumber: '010-1234-5678',
        content: '정직한 스토어',
      },
    });
    storeId = store.id;

    // 2. 판매자 B (악역) 생성 & 로그인 & 스토어 개설
    const sellerBData = { ...testUsers.seller, email: 'hacker@test.com', nickname: 'Hacker' };
    const sellerBUser = await request(app).post('/api/users').send(sellerBData);

    const loginB = await request(app).post('/api/auth/login').send({
      email: sellerBData.email,
      password: sellerBData.password,
    });
    anotherSellerToken = loginB.body.accessToken;

    await prisma.store.create({
      data: {
        name: '해커 스토어',
        userId: sellerBUser.body.id,
        address: '어둠의 경로',
        phoneNumber: '010-0000-0000',
        content: '해킹용',
      },
    });
  });

  afterAll(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  // =================================================================
  // SCENARIO START
  // =================================================================

  it('1. [등록] 판매자A가 상품을 등록한다.', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .field('name', '테스트 티셔츠')
      .field('price', 15000)
      .field('content', '편안한 티셔츠입니다.')
      .field('categoryName', 'TOP')
      .field('stocks', JSON.stringify([{ sizeId: sizeId, quantity: 10 }]))
      .attach('image', Buffer.from('fake-image-content'), 'test-image.png');

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('테스트 티셔츠');

    // 다음 스텝을 위해 ID 저장
    productId = res.body.id;
  });

  it('2. [조회] 등록된 상품 정보가 조회되고, 카테고리 필터링도 동작한다.', async () => {
    const detailRes = await request(app).get(`/api/products/${productId}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.name).toBe('테스트 티셔츠');
    expect(detailRes.body.storeName).toBe('판매자A의 스토어');

    await prisma.product.create({
      data: {
        name: '비교용 바지',
        price: 20000,
        content: '바지입니다.',
        categoryName: 'BOTTOM',
        storeId: storeId,
        image: 'pants.jpg',
      },
    });

    const listRes = await request(app).get('/api/products?categoryName=TOP');
    expect(listRes.status).toBe(200);

    const names = listRes.body.list.map((p: any) => p.name);
    expect(names).toContain('테스트 티셔츠');
    expect(names).not.toContain('비교용 바지');
  });

  it('3. [수정] 판매자A는 본인의 상품 정보를 수정할 수 있다.', async () => {
    const res = await request(app)
      .patch(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .field('name', '수정된 티셔츠')
      .field('price', 18000) // 가격 인상
      .field('stocks', JSON.stringify([{ sizeId: sizeId, quantity: 5 }]));

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('수정된 티셔츠');
    expect(res.body.price).toBe(18000);
  });

  it('4. [보안] 판매자B(타인)가 상품 수정을 시도하면 차단된다.', async () => {
    const res = await request(app)
      .patch(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${anotherSellerToken}`) // 해커 토큰
      .field('name', '해킹된 이름')
      .field('price', 0)
      .field('stocks', JSON.stringify([{ sizeId: sizeId, quantity: 0 }]));

    // Forbidden 에러 확인
    expect(res.status).toBe(403);
  });

  it('5. [보안] 판매자B(타인)가 상품 삭제를 시도하면 차단된다.', async () => {
    const res = await request(app)
      .delete(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${anotherSellerToken}`); // 해커 토큰

    expect(res.status).toBe(403);
  });

  it('6. [삭제] 판매자A는 본인의 상품을 정상적으로 삭제할 수 있다.', async () => {
    const res = await request(app)
      .delete(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${sellerToken}`);

    expect(res.status).toBe(204);

    const deletedProduct = await prisma.product.findUnique({
      where: { id: productId },
    });

    expect(deletedProduct).toBeNull();
  });
});
