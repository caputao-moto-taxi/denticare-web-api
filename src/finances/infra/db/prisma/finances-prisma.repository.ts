import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import type { FinanceQueryDto } from '../../../finance-query.dto';
import {
  FinanceMovement,
  IFinancesRepository,
} from '../../../domain/finances.repository';

@Injectable()
export class FinancesPrismaRepository implements IFinancesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async movements(branchId: string, query: FinanceQueryDto) {
    const createdAt = {
      ...(query.dateFrom && {
        gte: new Date(`${query.dateFrom}T00:00:00.000Z`),
      }),
      ...(query.dateTo && {
        lte: new Date(`${query.dateTo}T23:59:59.999Z`),
      }),
    };
    const includePatient = !query.source || query.source === 'patient';
    const includeStock = !query.source || query.source === 'stock';

    const [patientEntries, stockSales] = await Promise.all([
      includePatient
        ? this.prisma.patientFinancialEntry.findMany({
            where: {
              branchId,
              deletedAt: null,
              ...(Object.keys(createdAt).length > 0 && { createdAt }),
            },
            select: {
              id: true,
              reference: true,
              description: true,
              amount: true,
              method: true,
              status: true,
              createdAt: true,
              patient: { select: { firstName: true, lastName: true } },
            },
          })
        : Promise.resolve([]),
      includeStock
        ? this.prisma.stockSale.findMany({
            where: {
              branchId,
              ...(Object.keys(createdAt).length > 0 && { createdAt }),
            },
            select: {
              id: true,
              customerName: true,
              paymentMethod: true,
              total: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),
    ]);

    return [
      ...patientEntries.map(
        (entry): FinanceMovement => ({
          id: entry.id,
          reference: entry.reference,
          description: entry.description,
          patientName:
            `${entry.patient.firstName} ${entry.patient.lastName}`.trim(),
          source: 'patient',
          amount: entry.amount,
          method: entry.method,
          status: entry.status.toLowerCase() === 'paid' ? 'paid' : 'pending',
          date: entry.createdAt.toISOString(),
        }),
      ),
      ...stockSales.map(
        (sale): FinanceMovement => ({
          id: sale.id,
          reference: sale.id.slice(0, 8).toUpperCase(),
          description: 'Venda de artigo de stock',
          patientName: sale.customerName || 'Cliente de venda',
          source: 'stock',
          amount: sale.total,
          method: sale.paymentMethod,
          status: 'paid',
          date: sale.createdAt.toISOString(),
        }),
      ),
    ].sort((left, right) => right.date.localeCompare(left.date));
  }
}
