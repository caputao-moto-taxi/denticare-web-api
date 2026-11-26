import { InvalidUuidError, Uuid } from '../uuid.vo';
import { validate as uuidValidate } from 'uuid';
describe('Uuid Unit Tests', () => {
  test('should throw error when uuid is invalid', () => {
    expect(() => {
      new Uuid('invalid-uuid');
    }).toThrowError(new InvalidUuidError());
  });

  test('should create a valid uuid', () => {
    const uuid = new Uuid();
    expect(uuid.value).toBeDefined();
    expect(uuidValidate(uuid.value)).toBe(true);
  });

  test('should accept a valid uuid', () => {
    const uuid = new Uuid('c3e9b0d0-7b6f-4a8e-8e1f-3f9e6a2f7e3c');
    expect(uuid.value).toBe('c3e9b0d0-7b6f-4a8e-8e1f-3f9e6a2f7e3c');
  });
});
