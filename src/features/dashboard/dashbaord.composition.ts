import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardRepository } from './dashboard.repository';

export function createDashboardController(): DashboardController {
  const dashboardRepository = new DashboardRepository();

  const dashboardService = new DashboardService(dashboardRepository);

  const controller = new DashboardController(dashboardService);

  return controller;
}
