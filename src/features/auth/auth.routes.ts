import express from 'express';
import { loginSchema } from './auth.schema';
import { logoutAuth, refreshTokenAuth } from '../../lib/passport/index';
import { validateBody } from '../../shared/middleware/validate';
import { createAuthController } from './auth.composition';

const router = express.Router();
const controller = createAuthController();

/**
 * [POST] /api/auth/login router
 */
router.post('/auth/login', validateBody(loginSchema), controller.login);

/**
 * [POST] /api/auth/logout
 */
router.post('/auth/logout', logoutAuth, controller.logout);

/**
 * [POST] /api/auth/refresh
 */
router.post('/auth/refresh', refreshTokenAuth, controller.handleTokenRefresh);

export default router;
