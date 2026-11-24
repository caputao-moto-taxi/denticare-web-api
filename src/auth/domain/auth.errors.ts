export class DuplicateAuthEmailError extends Error {
  constructor() {
    super('An account with this email already exists');
    this.name = DuplicateAuthEmailError.name;
  }
}
