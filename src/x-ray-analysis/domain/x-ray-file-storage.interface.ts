export interface IXRayFileStorage {
  store(file: { id: string; data: Buffer; mimeType: string }): Promise<void>;
  get(id: string): Promise<{ data: Buffer }>;
  delete(id: string): Promise<void>;
}
