import { CONFIG_DB_SCHEMA } from './config.module';

describe('Schema Unit Tests', () => {
  describe('DB Schema', () => {
    describe('DATABASE_URL', () => {
      test('should throw if value is missing or not a string', () => {
        expect(() => CONFIG_DB_SCHEMA.DATABASE_URL(undefined as any)).toThrow(
          'DATABASE_URL is required and must be a string',
        );

        expect(() => CONFIG_DB_SCHEMA.DATABASE_URL(123 as any)).toThrow(
          'DATABASE_URL is required and must be a string',
        );
      });

      test('should return the value if it is a valid string', () => {
        const value = 'postgres://user:pass@localhost:5432/db';
        expect(CONFIG_DB_SCHEMA.DATABASE_URL(value)).toBe(value);
      });
    });
  });
});
