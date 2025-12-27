export function validateEmails(emailOrEmails: string | string[]): boolean {
  if (!emailOrEmails) return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (typeof emailOrEmails === 'string') {
    return emailRegex.test(emailOrEmails.toLowerCase());
  }

  if (Array.isArray(emailOrEmails)) {
    return emailOrEmails.every((email) => emailRegex.test(email.toLowerCase()));
  }

  return false;
}
