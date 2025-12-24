import { Router } from 'express';
import { DashboardController } from './dashboard.controller';
import { accessTokenAuth } from '../../lib/passport';

const router = Router();
const controller = new DashboardController();

router.get('/dashboard', accessTokenAuth, controller.getDashboard);

export default router;
