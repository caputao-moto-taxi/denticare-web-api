import { ICreateBranchWithHeadquarterCommand } from '../_@types/create-branch.t';

export abstract class IBranchRepository {
  abstract create(
    branch: ICreateBranchWithHeadquarterCommand,
  ): Promise<unknown>;
  abstract show(id: string): Promise<unknown>;
  abstract update(id: string, branch: unknown): Promise<unknown>;
  abstract delete(id: string): Promise<void>;
}
