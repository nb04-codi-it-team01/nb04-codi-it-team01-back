# 🧪 Project API Test & Environment Summary

본 문서는 **User(회원)** 및 **Review(리뷰)** 도메인의 단위 테스트 명세와 데이터 관리(Seed) 방법을 설명합니다.

---

## 1. User API 테스트 요약

#### 1-1. `createUser` - 회원가입

- ✅ 이메일이 중복되지 않으면 회원가입 성공
- ✅ 이메일이 중복되면 409 에러 발생
- ✅ 비밀번호 해싱 확인
- ✅ Repository 메서드 호출 순서 검증

#### 1-2. `getMyInfo` - 내 정보 조회

- ✅ 유저 ID로 정보 조회 성공
- ✅ 유저가 존재하지 않으면 404 에러 발생
- ✅ 비밀번호가 응답에서 제외되는지 확인

#### 1-3. `updateMyInfo` - 내 정보 수정

- ✅ 현재 비밀번호가 맞으면 정보 수정 성공
- ✅ 현재 비밀번호가 틀리면 401 에러 발생
- ✅ 유저가 존재하지 않으면 404 에러 발생
- ✅ 비밀번호를 변경하지 않으면 해싱하지 않음
- ✅ 새 비밀번호 해싱 확인

#### 1-4. `getMyLikes` - 관심 스토어 조회

- ✅ 관심 스토어 목록 조회 성공
- ✅ 유저가 존재하지 않으면 404 에러 발생
- ✅ 응답 데이터 형식 검증

#### 1-5. `deleteUser` - 회원 탈퇴

- ✅ 유저 삭제 성공
- ✅ 유저가 존재하지 않으면 404 에러 발생

---

## 2. Review API 테스트 요약

#### 2-1. `createReview` - 리뷰 작성

- ✅ **트랜잭션 검증**: 리뷰 생성과 주문 아이템 상태 변경(`isReviewed: true`)이 원자적으로 실행되는지 확인
- ✅ 유효성 검증 통과 시 리뷰 생성 성공
- ✅ **404 에러**: 주문 내역이 존재하지 않을 경우
- ✅ **403 에러**: 주문한 구매자가 아닌 경우 (권한 없음)
- ✅ **400 에러**: 해당 상품에 대한 주문이 아닌 경우
- ✅ **409 에러**: 이미 리뷰를 작성한 주문 건일 경우 (중복 작성 방지)

#### 2-2. `updateReview` - 리뷰 수정

- ✅ 작성자 본인이면 리뷰(별점 등) 수정 성공
- ✅ **404 에러**: 리뷰가 존재하지 않을 경우
- ✅ **403 에러**: 작성자가 아닌 타인이 수정을 시도할 경우

#### 2-3. `deleteReview` - 리뷰 삭제

- ✅ 작성자 본인이면 리뷰 삭제 성공
- ✅ **404 에러**: 리뷰가 존재하지 않을 경우
- ✅ **403 에러**: 작성자가 아닌 타인이 삭제를 시도할 경우

#### 2-4. `getReview` - 리뷰 단건 조회

- ✅ 리뷰 ID로 상세 정보 조회 성공
- ✅ **404 에러**: 리뷰가 존재하지 않을 경우

#### 2-5. `getReviews` - 상품별 리뷰 목록 조회

- ✅ 상품 ID 기준 리뷰 목록 조회 성공
- ✅ 페이지네이션(Page/Limit) 및 Skip 로직 적용 확인
- ✅ 응답 데이터 형식(Mapper) 검증

---

## 📊 테스트 커버리지 통합 요약

### 1. User Service (Coverage: 100%)

| 메서드       | 성공 케이스 | 에러 케이스 | 비고               |
| :----------- | :---------: | :---------: | :----------------- |
| createUser   |     ✅      |     ✅      | 해싱 검증 포함     |
| getMyInfo    |     ✅      |     ✅      | 비밀번호 제외 확인 |
| updateMyInfo |     ✅      |     ✅      | 비밀번호 검증 포함 |
| getMyLikes   |     ✅      |     ✅      | -                  |
| deleteUser   |     ✅      |     ✅      | -                  |

### 2. Review Service (Coverage: 100%)

| 메서드       | 성공 케이스 | 에러 케이스 | 비고              |
| :----------- | :---------: | :---------: | :---------------- |
| createReview |     ✅      |     ✅      | **트랜잭션 검증** |
| updateReview |     ✅      |     ✅      | -                 |
| deleteReview |     ✅      |     ✅      | -                 |
| getReview    |     ✅      |     ✅      | -                 |
| getReviews   |     ✅      |      -      | 페이지네이션 검증 |

### 🏆 총 테스트 케이스: 26개 (User 13 + Review 13)

---

## 🗄️ 실제 데이터 관리 (Seed)

테스트는 `Prisma Mock`을 사용하여 격리된 환경에서 수행하며, 개발용 실제 데이터는 Seed 스크립트를 통해 관리합니다.

### Seed 스크립트 구조

```
scripts/
├── seeds/
│   ├── grade/
│   │   └── grade.seed.ts      # 등급 데이터
│   ├── user/
│   │   └── user.seed.ts       # 사용자(구매자/판매자)
│   ├── store/
│   │   └── store.seed.ts      # 스토어
│   ├── product/
│   │   └── product.seed.ts    # 상품 및 재고
│   ├── order/
│   │   └── order.seed.ts      # 주문 및 주문 아이템
│   └── review/
│       └── review.seed.ts     # 리뷰 데이터
├── index-seed.ts              # 의존성 순서대로 전체 시드 실행
└── clear-db.ts                # DB 초기화
```

### Seed 명령어

```bash
# 1. 전체 시드 데이터 추가 (의존성 순서 자동 처리)
npm run seed

# 2. DB 초기화 후 재시드 (Reset)
npm run db:reset

# 3. 개별 도메인 시드 (필요 시)
npm run seed:users
npm run seed:stores
npm run seed:reviews
```

---

## 🚀 테스트 실행 방법

### 전체 테스트 실행

```bash
npm test
```

### 도메인별 테스트 실행

```bash
# User 도메인만 실행
npm test -- user

# Review 도메인만 실행
npm test -- review
```

### 단위 테스트(Unit)만 실행

```bash
npm test -- unit/user
npm test -- unit/review
```

### 커버리지 및 Watch 모드

```bash
# 전체 커버리지 확인
npm run test:cov

# 개발 중 실시간 테스트 확인 (Watch)
npm run test:watch
```

---

### 💡 개발 워크플로우 예시

1. **코드 수정**: 비즈니스 로직 변경
2. **단위 테스트**: `npm test -- unit/review` 로 로직 검증
3. **데이터 확인**: `npm run seed` 로 로컬 DB에 데이터 세팅 후 API 호출 테스트
4. **전체 검증**: `npm test` 로 전체 회귀 테스트 수행
