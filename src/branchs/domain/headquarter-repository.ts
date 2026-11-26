export abstract class IHeadquarterRepository {
  abstract create(headquarter: unknown): Promise<unknown>;
  abstract show(id: string): Promise<unknown>;
  abstract update(id: string, headquarter: unknown): Promise<unknown>;
  abstract delete(id: string): Promise<void>;
}
