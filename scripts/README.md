## 📁 폴더 구조

```
scripts/
├── seeds/                      # Feature별 시드 데이터
│   ├── grade/
│   │   └── grade.seed.ts      # Grade 시드
│   ├── user/
│   │   └── user.seed.ts       # User 시드
│   └── store/
│       └── store.seed.ts      # Store 시드
├── index-seed.ts              # 모든 시드 실행 (메인)
├── clear-db.ts                # DB 초기화
└── README.md                  # 이 파일
```

## 🚀 사용 방법

### 모든 시드 데이터 실행 (권장)

```bash
npm run seed
```

이 명령은 올바른 순서로 모든 데이터를 시드합니다:

1. Grade (등급)
2. User (사용자)
3. Store (스토어)

### Feature별 개별 실행

```bash
# Grade만 시드
npm run seed:grades

# User만 시드
npm run seed:users

# Store만 시드
npm run seed:stores
```

⚠️ **주의**: 외래키 의존성 때문에 순서가 중요합니다!

- User는 Grade가 필요
- Store는 User가 필요

### 데이터베이스 초기화

```bash
npm run db:clear
```

⚠️ **주의**: 모든 데이터가 삭제됩니다! (프로덕션에서는 실행 불가)

### 초기화 후 재시드

```bash
npm run db:reset
```

다음을 순서대로 실행:

1. 데이터베이스 초기화
2. 모든 시드 데이터 실행

## 📊 시드 데이터 상세

### 1. Grade (등급) - `seeds/grade/grade.seed.ts`

5개의 등급이 생성됩니다 (프론트엔드 Level 데이터와 매칭):

| ID           | Name   | Rate (%) | Min Amount  |
| ------------ | ------ | -------- | ----------- |
| grade_green  | Green  | 1%       | 0원         |
| grade_orange | Orange | 3%       | 100,000원   |
| grade_red    | Red    | 5%       | 300,000원   |
| grade_black  | Black  | 7%       | 500,000원   |
| grade_vip    | VIP    | 10%      | 1,000,000원 |

### 2. User (사용자) - `seeds/user/user.seed.ts`

5명의 사용자가 생성됩니다:

| ID            | Name   | Email               | Type   | Points  | Grade  |
| ------------- | ------ | ------------------- | ------ | ------- | ------ |
| user_buyer_1  | 김구매 | buyer1@example.com  | BUYER  | 50,000  | Green  |
| user_buyer_2  | 이구매 | buyer2@example.com  | BUYER  | 150,000 | Orange |
| user_buyer_3  | 박구매 | buyer3@example.com  | BUYER  | 600,000 | Black  |
| user_seller_1 | 박판매 | seller1@example.com | SELLER | 0       | Green  |
| user_seller_2 | 최판매 | seller2@example.com | SELLER | 0       | Green  |

**모든 사용자의 비밀번호**: `password123`

### 3. Store (스토어) - `seeds/store/store.seed.ts`

2개의 스토어가 생성됩니다:

| ID      | Name           | Owner                  | Address                        |
| ------- | -------------- | ---------------------- | ------------------------------ |
| store_1 | CODI-IT 강남점 | 박판매 (user_seller_1) | 서울특별시 강남구 테헤란로 123 |
| store_2 | Fashion Hub    | 최판매 (user_seller_2) | 서울특별시 서초구 서초대로 456 |

**참고**: Prisma 스키마에서 `userId`가 unique 제약이므로 **한 사용자당 하나의 스토어만** 생성 가능합니다.

## 🔧 새로운 Feature 시드 추가하기

### 1. 폴더 생성

```bash
mkdir scripts/seeds/product
```

### 2. 시드 파일 생성

```typescript
// scripts/seeds/product/product.seed.ts
import prisma from '../../../src/lib/prisma';

export const productData = [
  {
    id: 'product_1',
    name: '기본 티셔츠',
    price: 29000,
    // ...
  },
];

export async function seedProducts() {
  console.log('🌱 Seeding products...');

  for (const product of productData) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: product,
      create: product,
    });
    console.log(\`  ✅ \${product.name}\`);
  }

  console.log('✨ Product seeding completed!\\n');
}
```

### 3. index-seed.ts에 추가

```typescript
import { seedProducts } from './seeds/product/product.seed';

async function seedAll() {
  // ...
  await seedGrades();
  await seedUsers();
  await seedStores();
  await seedProducts(); // ← 추가
  // ...
}
```

### 4. package.json에 스크립트 추가

```json
{
  "scripts": {
    "seed:products": "tsx scripts/seeds/product/product.seed.ts"
  }
}
```

## 🛡️ 안전장치

### 1. Upsert 사용

모든 시드는 `upsert`를 사용:

- 데이터가 없으면 **생성**
- 데이터가 있으면 **업데이트**

→ **여러 번 실행해도 안전**

### 2. 프로덕션 보호

`clear-db.ts`는 프로덕션에서 실행 불가:

```typescript
if (process.env.NODE_ENV === 'production') {
  console.error('❌ Cannot clear database in production!');
  process.exit(1);
}
```

### 3. 외래키 순서 보장

`index-seed.ts`가 올바른 순서로 실행:

1. Grade (부모)
2. User (Grade에 의존)
3. Store (User에 의존)

## 🔍 트러블슈팅

### "Cannot find module '../../../src/lib/prisma'"

Prisma Client가 생성되지 않았을 수 있습니다:

```bash
npm run prisma:generate
```

### 외래키 제약 조건 에러

시드 실행 순서가 중요합니다:

- ❌ User → Grade: 실패 (Grade가 없음)
- ✅ Grade → User: 성공

`npm run seed`를 사용하면 자동으로 올바른 순서로 실행됩니다.

### TypeScript 실행 에러

`tsx`가 설치되어 있는지 확인:

```bash
npm install -D tsx
```

## 🎯 개발 워크플로우

### 초기 설정

```bash
# 1. DB 마이그레이션
npm run prisma:migrate

# 2. 초기 데이터 시드
npm run seed
```

### 개발 중

```bash
# 데이터 초기화 후 재시드
npm run db:reset
```

### 특정 Feature만 업데이트

```bash
# Store 데이터만 업데이트
npm run seed:stores
```
