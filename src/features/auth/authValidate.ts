import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email().min(2),
  password: z.string().min(8), //TODO: 나중에  웹으로 비밀번호 최소 길이 확인
});

const result = loginSchema.safeParse(req.body);

if (result.success) {
  result.data;
} else {
  result.error;
}
