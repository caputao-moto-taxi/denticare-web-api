export function splitName(fullName: string) {
  const [firstName, ...parts] = fullName.trim().replace(/\s+/g, ' ').split(' ');
  return { firstName, lastName: parts.join(' ') || firstName };
}

export function joinName(
  person: { firstName: string; lastName: string } | undefined,
  fallback: string,
) {
  return person ? `${person.firstName} ${person.lastName}`.trim() : fallback;
}

// Clinic staff are the only accounts that may use clinic resources.
export const STAFF_ROLES = new Set([
  'admin',
  'doctor',
  'nurse',
  'secretary',
  'receptionist',
]);
