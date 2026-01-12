# 🛍️ Codi-it

**Codi-it**은 판매자와 구매자 간의 원활한 거래를 지원하는 이커머스 플랫폼입니다. 실시간 알림, 등급별 포인트 시스템 등을 기능을 제공합니다.

---

## 🚀 Key Features

### 👤 User & Auth

- **Role-Based Access Control (RBAC):** 판매자(SELLER)와 구매자(BUYER)의 명확한 권한 분리.
- **Security:** JWT 기반 인증 및 개인정보 수정 시 비밀번호 2차 검증 로직 구현.
- **Membership:** 누적 구매액 기준 등급 산정 및 등급별 포인트 적립률 차등 적용.

### 🏪 Store & Product

- **Store Management:** 판매자 1인당 1개 스토어 개설 제한 및 대시보드 통계 제공.
- **Smart Shopping:** 카테고리 필터링, 정렬 조건(판매순, 별점순 등), 키워드 검색 지원.
- **Promotion:** 할인가 및 할인 기간 설정을 통한 유연한 프로모션 운영.

### 🛒 Order & Cart

- **Persistent Cart:** 로그아웃 후 재로그인 시에도 유지되는 장바구니 데이터 보존.
- **Order System:** 가상 결제 프로세스 및 결제 시 보유 포인트 사용 기능.
- **Inventory Check:** 주문 시 실시간 재고 확인 및 품절 시 트랜잭션 예외 처리.

### 💬 Communication & Notification

- **Inquiry & Review:** 상품 문의(비밀글 지원) 및 구매 확정 상품에 대한 별점 리뷰 작성.
- **Real-time Notification:** SSE(Server-Sent Events)를 활용한 품절 및 문의 답변 실시간 알림 시스템.

---

## 🛠 Tech Stack

- **Backend:** Node.js, TypeScript, Express
- **Database:** PostgreSQL, Prisma ORM
- **Testing:** Jest, Supertest
- **Infrastructure:** AWS EC2, S3, RDS, PM2
- **CI/CD:** GitHub Actions

---

## 📊 Database Architecture (Data Integrity)

데이터 무결성과 비즈니스 이력 보존을 위해 `Cascade`와 `SetNull` 전략을 혼합하여 설계했습니다.

### Schema Integrity

- **Cascade (임시 데이터):** 유저 삭제 시 장바구니, 알림, 좋아요 등 종속 데이터 자동 삭제.
- **SetNull (백업 데이터):** 유저나 스토어 삭제 시에도 주문 내역, 리뷰, 문의 등은 통계 및 증빙을 위해 기록 보존.

---

## 🌐 Deployment & CI/CD

- Infrastructure: AWS EC2 인스턴스에 PM2를 활용한 무중단 배포 환경 구축.
- CI/CD 파이프라인: GitHub Actions를 통해 Main 브랜치 Push 시 Test -> Build -> Deploy 자동화 프로세스 구축.

---

## 📂 Project Structure

```
.
├── prisma/             # Prisma 스키마 및 마이그레이션 파일
├── scripts/            # DB 초기화 및 데이터 시딩(Seed) 스크립트
├── tests/              # 테스트 스위트
│   ├── unit/           # Repository, Service 단위 테스트
│   └── integration/    # 기능별 비즈니스 시나리오 통합 테스트
└── src/
    ├── features/       # 도메인별 핵심 비즈니스 로직
    │   ├── auth/       # 로그인, 회원가입, JWT 전략
    │   ├── cart/       # 장바구니 관리
    │   ├── dashboard/  # 판매자 통계 데이터
    │   ├── inquiry/    # 상품 문의 및 답변
    │   ├── notification/ # SSE 기반 실시간 알림
    │   ├── order/      # 주문 및 가상 결제
    │   ├── product/    # 상품 등록 및 조회 (필터링/정렬)
    │   ├── review/     # 상품 리뷰 및 별점
    │   ├── store/      # 스토어 관리 및 찜하기
    │   └── user/       # 프로필 관리 및 등급 시스템
    ├── shared/         # 공통 미들웨어 및 전역 타입
    ├── lib/            # Prisma, Passport 등 라이브러리 설정
    └── server.ts       # 앱 엔트리 포인트
```

---

## 🧪 Testing & Coverage

본 프로젝트는 핵심 비즈니스 로직에 대해 높은 테스트 커버리지를 유지하며, 안정적인 배포 환경을 보장합니다.

```ts
npm test           # 전체 통합 및 유닛 테스트 실행
npm run test:cov   # 테스트 커버리지 리포트 생성
```

---

## 📋 Prerequisites

프로젝트 실행을 위해 아래 환경이 권장됩니다.

- **Node.js:** v20.x 이상 (v22.x 권장)
- **npm:** v10.x 이상
- **Database:** PostgreSQL v15 이상

---

## ⚙️ Environment Variables

프로젝트 루트에 `.env` 파일을 생성하고 아래 변수들을 설정해야 합니다.

```env
# 환경 설정
NODE_ENV=development
PORT=3001

# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/project3db"

# Auth (JWT Secrets)
JWT_ACCESS_SECRET="your-access-secret-key-here"
JWT_REFRESH_SECRET="your-refresh-secret-key-here"

# AWS S3 (Image Storage)
AWS_ACCESS_KEY_ID="your-access-key-id"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="ap-northeast-2"
AWS_BUCKET_NAME="codiit-team1-images"
```

---

💻 Getting Started

### 1. Installation & Setup

```ts
npm install
npm run prisma:generate
```

### 2. Database Initialization

```ts
# DB 초기화 및 모든 시드 데이터(Grade, Size, User, Product 등) 한 번에 삽입
npm run db:reset
```

3. Execution

```ts
# 개발 모드 (tsx watch)
npm run dev

# 프로덕션 빌드 및 실행
npm run build
npm start
```
