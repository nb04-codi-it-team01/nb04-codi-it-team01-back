import { Request, Response } from 'express';
import { GradeService } from './grade.service';

export class GradeController {
  constructor(private readonly gradeService = new GradeService()) {}

  getGrades = (req: Request, res: Response) => {
    const grades = this.gradeService.getGrades();
    return res.status(200).json(grades);
  };
}
