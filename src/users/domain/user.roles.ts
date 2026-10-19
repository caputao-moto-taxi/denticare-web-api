export const STAFF_ROLES = ['admin', 'doctor', 'nurse', 'secretary'] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];
