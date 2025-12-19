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
    return (
      sortedGrades.find((grade) => amount >= grade.minAmount) ||
      sortedGrades[sortedGrades.length - 1]
    );
  }
}
