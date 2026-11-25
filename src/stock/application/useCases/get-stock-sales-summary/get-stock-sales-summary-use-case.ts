import { AuthUser } from '../../../../auth/auth-user';
import { IStockRepository } from '../../../domain/stock.repository';
import { requireStockStaff } from '../../stock-policies';

export class GetStockSalesSummaryUseCase {
  constructor(private readonly repository: IStockRepository) {}

  execute(user: AuthUser) {
    requireStockStaff(user);
    const startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() - 6);
    startDate.setUTCHours(0, 0, 0, 0);

    return this.repository.salesSummary(user, startDate).then((data) => {
      const salesByDay = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(startDate);
        date.setUTCDate(startDate.getUTCDate() + index);
        return {
          date: date.toISOString().slice(0, 10),
          count: 0,
          revenue: 0,
        };
      });
      const salesByDate = new Map(salesByDay.map((day) => [day.date, day]));
      for (const sale of data.recentSales) {
        const day = salesByDate.get(sale.createdAt.toISOString().slice(0, 10));
        if (day) {
          day.count += 1;
          day.revenue += sale.total;
        }
      }

      return {
        totalSales: data.totals._count._all,
        totalRevenue: data.totals._sum.total ?? 0,
        averageTicket: data.totals._avg.total ?? 0,
        salesByDay,
        paymentMethods: data.paymentMethods.map((method) => ({
          method: method.paymentMethod,
          count: method._count._all,
          revenue: method._sum.total ?? 0,
        })),
        topProducts: data.topProducts.map((product) => ({
          stockItemId: product.stockItemId,
          itemName: product.itemName,
          quantity: product._sum.quantity ?? 0,
          revenue: product._sum.totalPrice ?? 0,
        })),
      };
    });
  }
}
