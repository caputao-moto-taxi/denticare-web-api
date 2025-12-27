import { randomBytes } from 'crypto';

/**
 * generate a random API key
 * @param length qtd de bytes (opcional, padrão: 32)
 * @returns API Key in hex format
 */
export function GenerateApiKey(length: number = 32): string {
  return randomBytes(length).toString('hex');
}