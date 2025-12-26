import { DashboardRepository } from './dashboard.repository';
import type {
  FindDashboardResponseDto,
  TotalCheck,
  PriceRangeDto,
  TopSales,
} from './dashboard.dto';
import { AppError } from '../../shared/middleware/error-handler';
import { Order, OrderItem } from '@prisma/client';

export interface OrderItemWithOrder extends OrderItem {
  order: Order | null;
}

export interface DashboardOrderData {
  todayOrders: OrderItemWithOrder[];
  yesterdayOrders: OrderItemWithOrder[];
  weekOrders: OrderItemWithOrder[];
  twoWeeksOrders: OrderItemWithOrder[];
  monthOrders: OrderItemWithOrder[];
  twoMonthsOrders: OrderItemWithOrder[];
  yearOrders: OrderItemWithOrder[];
  twoYearsOrders: OrderItemWithOrder[];
}

type DashboardPeriods = 'today' | 'week' | 'month' | 'year';
type PeriodResult = Record<
  DashboardPeriods,
  {
    current: TotalCheck;
    previous: TotalCheck;
    changeRate: TotalCheck;
  }
>;

export class DashboardService {
  constructor(private readonly dashboardRepository = new DashboardRepository()) {}

  async findDashboard(userId: string): Promise<FindDashboardResponseDto> {
    const orders = await this.dashboardRepository.getDashboardData(userId);
    const topProductsRaw = await this.dashboardRepository.getProductForDashboard(userId);

    if (!orders) {
      throw new AppError(404, '주문 정보를 찾을 수 없습니다.');
    }

    const getStats = (itemArray: OrderItemWithOrder[]): TotalCheck => {
      const uniqueOrderIds = new Set(itemArray.map((i) => i.orderId).filter(Boolean));
      return {
        totalOrders: uniqueOrderIds.size,
        totalSales: itemArray.reduce((sum, i) => sum + (i.price * i.quantity || 0), 0),
      };
    };

    const getChangeRate = (current: TotalCheck, previous: TotalCheck): TotalCheck => ({
      totalOrders: current.totalOrders - previous.totalOrders,
      totalSales: current.totalSales - previous.totalSales,
    });

    const result = {} as PeriodResult;

    const periods: {
      key: DashboardPeriods;
      curr: OrderItemWithOrder[];
      prev: OrderItemWithOrder[];
    }[] = [
      { key: 'today', curr: orders.todayOrders, prev: orders.yesterdayOrders },
      { key: 'week', curr: orders.weekOrders, prev: orders.twoWeeksOrders },
      { key: 'month', curr: orders.monthOrders, prev: orders.twoMonthsOrders },
      { key: 'year', curr: orders.yearOrders, prev: orders.twoYearsOrders },
    ];

    periods.forEach(({ key, curr, prev }) => {
      const currentStats = getStats(curr);
      const previousStats = getStats(prev);
      result[key] = {
        current: currentStats,
        previous: previousStats,
        changeRate: getChangeRate(currentStats, previousStats),
      };
    });

    const topSales: TopSales[] = topProductsRaw.map((p) => ({
      totalOrders: p._sum.quantity ?? 0,
      product: {
        id: p.productId ?? '',
        name: p.productName ?? '알 수 없는 상품',
        price: Math.round((p.revenue / (p._sum.quantity || 1)) * 100) / 100,
      },
    }));

    const priceRange = this.calculatePriceRange(orders.yearOrders);

    return {
      today: result.today,
      week: result.week,
      month: result.month,
      year: result.year,
      topSales,
      priceRange,
    };
  }

  private calculatePriceRange(items: OrderItemWithOrder[]): PriceRangeDto[] {
    const ranges = [
      { label: '1만원 미만', min: 0, max: 9999 },
      { label: '1~3만원', min: 10000, max: 29999 },
      { label: '3~5만원', min: 30000, max: 49999 },
      { label: '5~10만원', min: 50000, max: 99999 },
      { label: '10만원 이상', min: 100000, max: Infinity },
    ];

    const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
    if (totalQuantity === 0) return [];

    return ranges.map((r) => {
      const countInPriceRange = items
        .filter((i) => i.price >= r.min && i.price <= r.max)
        .reduce((sum, i) => sum + i.quantity, 0);

      return {
        priceRange: r.label,
        totalSales: countInPriceRange,
        percentage: Math.round((countInPriceRange / totalQuantity) * 100),
      };
    });
  }
}
