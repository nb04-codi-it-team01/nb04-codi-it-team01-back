import { Router } from 'express';
import { DashboardController } from './dashboard.controller';
import { accessTokenAuth } from '../../shared/middleware/auth';

const router = Router();
const controller = new DashboardController();

router.get('/dashboard', accessTokenAuth, controller.getDashboard);

export default router;
