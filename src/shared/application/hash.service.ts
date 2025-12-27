import * as bcrypt from 'bcrypt';
import { IHashService } from './interfaces/IHash';

export class HashService implements IHashService {
  constructor(private readonly saltOrRounds = 10) {}

  async hashPassword(password: string): Promise<string> {
    if (!password) {
      throw new Error('Password cannot be empty');
    }
    return bcrypt.hash(password, this.saltOrRounds);
  }

  async compare(plainText: string, hashedText: string): Promise<boolean> {
    return bcrypt.compare(plainText, hashedText);
  }
}
