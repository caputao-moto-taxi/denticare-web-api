import {
  IAuthRepository,
  RefreshCommand,
} from '../../../domain/auth.repository';

export type RefreshInput = { input: RefreshCommand };

export class RefreshUseCase {
  constructor(private readonly repository: IAuthRepository) {}

  execute({ input }: RefreshInput) {
    return this.repository.refresh(input);
  }
}
