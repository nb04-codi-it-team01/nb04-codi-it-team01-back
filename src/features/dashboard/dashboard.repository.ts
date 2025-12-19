import prisma from '../../lib/prisma';

export class DashboardRepository {
  async getDashboardData(userId: string) {
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

    const allOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startOfTwoYears },
        orderItems: {
          some: {
            product: { store: { userId: userId } },
          },
        },
      },
      include: {
        orderItems: true,
      },
    });

    const todayOrders = allOrders.filter((o) => o.createdAt >= startOfToday);
    const yesterdayOrders = allOrders.filter(
      (o) => o.createdAt >= startOfYesterDay && o.createdAt < startOfToday,
    );
    const weekOrders = allOrders.filter((o) => o.createdAt >= startOfWeek);
    const twoWeeksOrders = allOrders.filter(
      (o) => o.createdAt >= startOfTwoWeeks && o.createdAt < startOfWeek,
    );
    const monthOrders = allOrders.filter((o) => o.createdAt >= startOfMonth);
    const twoMonthsOrders = allOrders.filter(
      (o) => o.createdAt >= startOfTwoMonths && o.createdAt < startOfMonth,
    );
    const yearOrders = allOrders.filter((o) => o.createdAt >= startOfYear);
    const twoYearsOrders = allOrders.filter(
      (o) => o.createdAt >= startOfTwoYears && o.createdAt < startOfYear,
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
    const productStats = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        product: {
          store: { userId: userId },
        },
      },
      _sum: {
        quantity: true,
      },
      _count: {
        productId: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 5,
    });

    const productsWithNames = await Promise.all(
      productStats.map(async (stat) => {
        if (!stat.productId) return null;

        const product = await prisma.product.findUnique({
          where: { id: stat.productId },
          select: {
            name: true,
            price: true,
          },
        });
        return {
          ...stat,
          productName: product?.name,
          revenue: (product?.price || 0) * (stat._sum.quantity || 0),
        };
      }),
    );

    const finalResult = productsWithNames.filter((item) => item !== null);

    return finalResult;
  }
}
