export interface IHashService {
  hashPassword(password: string): Promise<string>;
  compare(plainText: string, hashedText: string): Promise<boolean>;
}
