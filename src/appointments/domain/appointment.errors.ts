export abstract class AppointmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class AppointmentNotFoundError extends AppointmentError {}

export class AppointmentAccessDeniedError extends AppointmentError {}

export class AppointmentConflictError extends AppointmentError {}

export class AppointmentRuleViolationError extends AppointmentError {}
