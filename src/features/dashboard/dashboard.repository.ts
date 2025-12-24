import prisma from '../../lib/prisma';

export class DashboardRepository {
  async getDashboardData(userId: string) {
    const store = await prisma.store.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!store) throw new Error('Store not found');

    const now = new Date();
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));
    const startOfYesterDay = new Date(new Date(startOfToday).setDate(startOfToday.getDate() - 1));
    const startOfWeek = new Date(new Date(startOfToday).setDate(startOfToday.getDate() - 7));
    const startOfTwoWeeks = new Date(new Date(startOfToday).setDate(startOfToday.getDate() - 14));
    const startOfMonth = new Date(new Date(startOfToday).setMonth(startOfToday.getMonth() - 1));
    const startOfTwoMonths = new Date(new Date(startOfToday).setMonth(startOfToday.getMonth() - 2));
    const startOfYear = new Date(
      new Date(startOfToday).setFullYear(startOfToday.getFullYear() - 1),
    );
    const startOfTwoYears = new Date(
      new Date(startOfToday).setFullYear(startOfToday.getFullYear() - 2),
    );

    const items = await prisma.orderItem.findMany({
      where: {
        storeId: store.id,
        order: {
          createdAt: { gte: startOfTwoYears },
        },
      },
      include: {
        order: true,
      },
    });

    const todayOrders = items.filter((i) => i.order!.createdAt >= startOfToday);
    const yesterdayOrders = items.filter(
      (i) => i.order!.createdAt >= startOfYesterDay && i.order!.createdAt < startOfToday,
    );
    const weekOrders = items.filter((i) => i.order!.createdAt >= startOfWeek);
    const twoWeeksOrders = items.filter(
      (i) => i.order!.createdAt >= startOfTwoWeeks && i.order!.createdAt < startOfWeek,
    );
    const monthOrders = items.filter((i) => i.order!.createdAt >= startOfMonth);
    const twoMonthsOrders = items.filter(
      (i) => i.order!.createdAt >= startOfTwoMonths && i.order!.createdAt < startOfMonth,
    );
    const yearOrders = items.filter((i) => i.order!.createdAt >= startOfYear);
    const twoYearsOrders = items.filter(
      (i) => i.order!.createdAt >= startOfTwoYears && i.order!.createdAt < startOfYear,
    );

    return {
      todayOrders,
      yesterdayOrders,
      weekOrders,
      twoWeeksOrders,
      monthOrders,
      twoMonthsOrders,
      yearOrders,
      twoYearsOrders,
    };
  }

  //   async getOrderByStore(userId: string) {
  //     const orderCount = await prisma.order.count({
  //       where: {
  //         orderItems: {
  //           some: {
  //             product: {
  //               store: {
  //                 userId: userId,
  //               },
  //             },
  //           },
  //         },
  //       },
  //     });

  //     return { totalOrders: orderCount };
  //   }

  async getProductForDashboard(userId: string) {
    const store = await prisma.store.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!store) return [];

    const items = await prisma.orderItem.findMany({
      where: {
        storeId: store.id,
      },
      select: {
        productId: true,
        productName: true,
        quantity: true,
        price: true,
      },
    });

    type AggregatedProduct = {
      productId: string | null;
      totalQuantity: number;
      totalRevenue: number;
    };

    const statsMap = items.reduce(
      (acc, item) => {
        const name = item.productName;

        if (!acc[name]) {
          acc[name] = {
            productId: item.productId,
            totalQuantity: 0,
            totalRevenue: 0,
          };
        }

        acc[name].totalQuantity += item.quantity;
        acc[name].totalRevenue += item.quantity * item.price;

        return acc;
      },
      {} as Record<string, AggregatedProduct>,
    );

    const finalResult = Object.entries(statsMap)
      .map(([name, stat]) => ({
        productId: stat.productId,
        productName: name,
        _sum: {
          quantity: stat.totalQuantity,
        },
        revenue: stat.totalRevenue,
      }))
      .sort((a, b) => b._sum.quantity - a._sum.quantity)
      .slice(0, 5);

    return finalResult;
  }
}
