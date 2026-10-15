

export abstract class IHeadquarterRepository {
  abstract create(headquarter: any): Promise<any>;
  abstract show(id: string): Promise<any>;
  abstract update(id: string, headquarter: any): Promise<any>;
  abstract delete(id: string): Promise<void>;
}