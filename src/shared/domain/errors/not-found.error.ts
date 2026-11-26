export class NotFoundError extends Error {
  constructor(id: unknown, entityClass: { name: string }) {
    const idsMessage = Array.isArray(id) ? id.join(',') : id;
    super(`${entityClass.name} Not Found using ID ${idsMessage}`);
    this.name = 'NotFoundError';
  }
}
