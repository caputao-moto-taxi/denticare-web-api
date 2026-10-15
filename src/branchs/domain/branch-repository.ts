import { ICreateBranchWithHeadquarterCommand } from "../_@types/create-branch.t";

export abstract class IBranchRepository {
  abstract create(branch: ICreateBranchWithHeadquarterCommand): Promise<any>;
  abstract show(id: string): Promise<any>;
  abstract update(id: string, branch: any): Promise<any>;
  abstract delete(id: string): Promise<void>;
}