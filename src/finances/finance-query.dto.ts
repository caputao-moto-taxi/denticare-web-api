import { IsIn, IsOptional } from 'class-validator';
import { ListQueryDto } from '../shared/infra/http/list-query.dto';

export class FinanceQueryDto extends ListQueryDto {
  @IsOptional()
  @IsIn(['patient', 'stock'])
  source?: 'patient' | 'stock';

  @IsOptional()
  @IsIn(['paid', 'pending'])
  status?: 'paid' | 'pending';

  @IsOptional()
  @IsIn([
    'Multicaixa',
    'Transferência',
    'Dinheiro',
    'Convênio',
    'cash',
    'card',
    'transfer',
    'other',
  ])
  method?: string;
}
