# codi-it

Codeit 고급 프로젝트

## Scripts

```bash
npm run dev        # 개발 서버 (tsx)
npm run build      # tsc 빌드
npm run start      # 빌드 결과 실행
npm test           # Jest 테스트
npm run test:cov   # Jest 커버리지
npm run lint       # ESLint
npm run format:fix # Prettier 포맷
```

## Schema updates

✅ Cascade 유지 (임시 데이터)
User → Cart → CartItem <br />
User → Notification <br />
User/Store → UserLike <br />
Product/Category → ProductCategory

✅ SetNull 적용 (백업 데이터 보존)
##### 유저 삭제 시
User → Order.buyerId <br />
User → Review.userId <br />
User → Inquiry.userId <br />
User → InquiryReply.userId <br />
User → Grade.gradeId

##### 스토어 삭제 시
Store → Product.storeId

##### 상품 삭제 시
Product → Stock.productId <br />
Product → CartItem.productId <br />
Product → OrderItem.productId <br />
Product → Review.productId <br />
Product → Inquiry.productId 

##### 주문 삭제 시
Order → OrderItem.orderId <br />
Order → Payment.orderId

##### 문의 삭제 시
Inquiry → InquiryReply.inquiryId
