import { AuthUser } from '../../../../auth/auth-user';
import { IStockRepository } from '../../../domain/stock.repository';
import {
  requireStockAdministrator,
  requireStockStaff,
} from '../../stock-policies';

export type RemoveStockItemInput = { user: AuthUser; id: string };

export class RemoveStockItemUseCase {
  constructor(private readonly repository: IStockRepository) {}

  execute({ user, id }: RemoveStockItemInput) {
    requireStockStaff(user);
    requireStockAdministrator(user);
    return this.repository.remove(user, id);
  }
}
