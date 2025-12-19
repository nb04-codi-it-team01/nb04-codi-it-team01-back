import { Router } from 'express';
import { GradeController } from './grade.controller';

const router = Router();
const controller = new GradeController();

router.get('/grade', controller.getGrades);

export default router;
