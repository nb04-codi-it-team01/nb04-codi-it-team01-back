import type { RequestHandler } from 'express';
import { DashboardService } from './dashboard.service';
import { AppError } from '../../shared/middleware/error-handler';

export class DashboardController {
  constructor(private readonly dashboardService = new DashboardService()) {}

  getDashboard: RequestHandler = async (req, res) => {
    if (req.user!.type !== 'SELLER') {
      throw new AppError(403, '판매자만 이용할 수 있습니다.');
    }

    const result = await this.dashboardService.findDashboard(req.user!.id);
    res.status(200).json(result);
  };
}
