export interface IPatientFileStorage {
  store(file: { id: string; data: Buffer; mimeType: string }): Promise<void>;
  get(id: string): Promise<{
    data: Buffer;
    mime_type: string | undefined;
  }>;
  delete(id: string): Promise<void>;
}