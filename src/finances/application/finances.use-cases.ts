import { Injectable } from '@nestjs/common';
import { AuthUser } from '../../auth/auth-user';
import type { FinanceQueryDto } from '../finance-query.dto';
import {
  FinanceMovement,
  IFinancesRepository,
} from '../domain/finances.repository';

@Injectable()
export class FinancesUseCases {
  constructor(private readonly repository: IFinancesRepository) {}

  async summary(user: AuthUser, query: FinanceQueryDto) {
    const movements = this.filter(
      await this.repository.movements(user.branchId, query),
      query,
    );
    const income = movements.reduce(
      (total, movement) => total + movement.amount,
      0,
    );
    const received = movements
      .filter((movement) => movement.status === 'paid')
      .reduce((total, movement) => total + movement.amount, 0);
    const pending = movements
      .filter((movement) => movement.status === 'pending')
      .reduce((total, movement) => total + movement.amount, 0);

    return {
      period: {
        dateFrom: query.dateFrom ?? null,
        dateTo: query.dateTo ?? null,
      },
      income,
      received,
      pending,
      totalExpenses: null,
      expensesAvailable: false,
      expensesDescription:
        'Não existem despesas registadas no sistema; este valor não representa as despesas reais da clínica.',
      currentBalance: received,
      trends: this.buildTrends(movements, query),
      distributions: this.buildDistributions(movements),
    };
  }

  async movements(user: AuthUser, query: FinanceQueryDto) {
    const filtered = this.filter(
      await this.repository.movements(user.branchId, query),
      query,
    ).sort((left, right) => right.date.localeCompare(left.date));
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const start = (page - 1) * pageSize;
    return {
      data: filtered.slice(start, start + pageSize),
      meta: {
        page,
        pageSize,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / pageSize),
      },
    };
  }

  private filter(movements: FinanceMovement[], query: FinanceQueryDto) {
    return movements
      .filter((movement) => !query.source || movement.source === query.source)
      .filter((movement) => !query.status || movement.status === query.status)
      .filter((movement) => !query.method || movement.method === query.method)
      .filter((movement) => {
        if (!query.search) return true;
        const needle = query.search.toLocaleLowerCase();
        return [
          movement.reference,
          movement.description,
          movement.patientName,
          movement.method,
          movement.source,
        ].some((value) => value.toLocaleLowerCase().includes(needle));
      });
  }

  private buildTrends(movements: FinanceMovement[], query: FinanceQueryDto) {
    const start = query.dateFrom
      ? new Date(`${query.dateFrom}T00:00:00.000Z`)
      : new Date(
          Date.UTC(
            new Date().getUTCFullYear(),
            new Date().getUTCMonth() - 5,
            1,
          ),
        );
    const end = query.dateTo
      ? new Date(`${query.dateTo}T00:00:00.000Z`)
      : new Date();
    const buckets = new Map<
      string,
      { date: string; income: number; received: number }
    >();
    for (
      const cursor = new Date(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1),
      );
      cursor <= end;
      cursor.setUTCMonth(cursor.getUTCMonth() + 1)
    ) {
      const key = cursor.toISOString().slice(0, 7);
      buckets.set(key, { date: key, income: 0, received: 0 });
    }
    for (const movement of movements) {
      const bucket = buckets.get(movement.date.slice(0, 7));
      if (!bucket) continue;
      bucket.income += movement.amount;
      if (movement.status === 'paid') bucket.received += movement.amount;
    }
    return [...buckets.values()];
  }

  private buildDistributions(movements: FinanceMovement[]) {
    const group = (key: (movement: FinanceMovement) => string) => {
      const buckets = new Map<
        string,
        { value: string; count: number; amount: number }
      >();
      for (const movement of movements) {
        const value = key(movement);
        const bucket = buckets.get(value) ?? { value, count: 0, amount: 0 };
        bucket.count += 1;
        bucket.amount += movement.amount;
        buckets.set(value, bucket);
      }
      return [...buckets.values()].sort(
        (left, right) => right.amount - left.amount,
      );
    };
    return {
      sources: group((movement) => movement.source),
      paymentMethods: group((movement) => movement.method),
      statuses: group((movement) => movement.status),
    };
  }
}
