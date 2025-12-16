# User API 테스트 요약

#### 1. `createUser` - 회원가입

- ✅ 이메일이 중복되지 않으면 회원가입 성공
- ✅ 이메일이 중복되면 409 에러 발생
- ✅ 비밀번호 해싱 확인
- ✅ Repository 메서드 호출 순서 검증

#### 2. `getMyInfo` - 내 정보 조회

- ✅ 유저 ID로 정보 조회 성공
- ✅ 유저가 존재하지 않으면 404 에러 발생
- ✅ 비밀번호가 응답에서 제외되는지 확인

#### 3. `updateMyInfo` - 내 정보 수정

- ✅ 현재 비밀번호가 맞으면 정보 수정 성공
- ✅ 현재 비밀번호가 틀리면 401 에러 발생
- ✅ 유저가 존재하지 않으면 404 에러 발생
- ✅ 비밀번호를 변경하지 않으면 해싱하지 않음
- ✅ 새 비밀번호 해싱 확인

#### 4. `getMyLikes` - 관심 스토어 조회

- ✅ 관심 스토어 목록 조회 성공
- ✅ 유저가 존재하지 않으면 404 에러 발생
- ✅ 응답 데이터 형식 검증

#### 5. `deleteUser` - 회원 탈퇴

- ✅ 유저 삭제 성공
- ✅ 유저가 존재하지 않으면 404 에러 발생

---

## 📊 테스트 커버리지 요약

### Service 계층 커버리지: 100%

| 메서드       | 성공 케이스 | 에러 케이스 | 커버리지 |
| ------------ | ----------- | ----------- | -------- |
| createUser   | ✅          | ✅          | 100%     |
| getMyInfo    | ✅          | ✅          | 100%     |
| updateMyInfo | ✅          | ✅          | 100%     |
| getMyLikes   | ✅          | ✅          | 100%     |
| deleteUser   | ✅          | ✅          | 100%     |

### 총 테스트 케이스: 13개

---

## 🗄️ 실제 데이터는 Seed 스크립트로 관리

테스트는 Mock을 사용하고, 실제 DB 데이터는 별도로 관리합니다.

### Seed 스크립트 구조

```
scripts/
├── seeds/
│   ├── grade/
│   │   └── grade.seed.ts      # 5개 등급
│   ├── user/
│   │   └── user.seed.ts       # 5명 사용자
│   └── store/
│       └── store.seed.ts      # 3개 스토어
├── index-seed.ts              # 모든 시드 실행
└── clear-db.ts                # DB 초기화
```

### Seed 사용법

```bash
# 모든 시드 데이터 추가
npm run seed

# DB 초기화 후 재시드
npm run db:reset

# 개별 시드
npm run seed:grades
npm run seed:users
npm run seed:stores
```

---

## 🚀 테스트 실행 방법

### 모든 테스트 실행

```bash
npm test
```

### User 테스트만 실행

```bash
npm test -- user
```

### 단위 테스트만 실행

```bash
npm test -- unit/user
```

### 커버리지 확인

```bash
npm run test:cov
```

### Watch 모드

```bash
npm run test:watch
```

---

### 사용 예시

```bash
# 코드 수정 후 로직 검증
npm test

# 개발 환경 초기화
npm run seed

# DB 초기화 후 재시작
npm run db:reset
```

---
