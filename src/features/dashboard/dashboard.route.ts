import { Router } from 'express';
import { createDashboardController } from './dashbaord.composition';
import { accessTokenAuth } from '../../shared/middleware/auth';

const router = Router();
const controller = createDashboardController();

router.get('/dashboard', accessTokenAuth, controller.getDashboard);

export default router;
