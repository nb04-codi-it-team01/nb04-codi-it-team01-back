import { Prisma } from '@prisma/client';
import { GRADE_METADATA } from './grade.constant';

export class GradeService {
  /**
   * 등급 메타데이터 목록 조회
   */
  getGrades() {
    return GRADE_METADATA;
  }

  /**
   * 구매 금액에 따른 등급 계산 로직
   */
  calculateGrade(amount: number) {
    const sortedGrades = [...GRADE_METADATA].sort((a, b) => b.minAmount - a.minAmount);
    const target =
      sortedGrades.find((grade) => amount >= grade.minAmount) ||
      sortedGrades[sortedGrades.length - 1];

    return target!;
  }

  async syncUserGrade(
    tx: Prisma.TransactionClient,
    userId: string,
    totalAmount: number,
    currentGradeId: string,
  ) {
    const targetGrade = this.calculateGrade(totalAmount);

    if (targetGrade.id !== currentGradeId) {
      await tx.user.update({
        where: { id: userId },
        data: { gradeId: targetGrade.id },
      });
      return targetGrade;
    }

    return null;
  }
}
