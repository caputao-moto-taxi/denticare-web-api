import { AggregateRoot } from '../../shared/domain/aggregate-root';
import { ValueObject } from '../../shared/domain/value-object';
import { Notification } from '../../shared/domain/validators/notification';
import {
  InvalidUuidError,
  Uuid,
} from '../../shared/domain/value-objects/uuid.vo';
import {
  AppointmentNotFoundError,
  AppointmentRuleViolationError,
} from './appointment.errors';
import { AppointmentValidatorFactory } from './appointment.validator';

export class AppointmentId extends Uuid {
  // A malformed id can never match a stored appointment.
  static parse(value: string): AppointmentId {
    try {
      return new AppointmentId(value);
    } catch (error) {
      if (error instanceof InvalidUuidError) {
        throw new AppointmentNotFoundError('Appointment not found');
      }
      throw error;
    }
  }
}

export const AppointmentStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
  NO_SHOW: 'NO_SHOW',
  RESCHEDULED: 'RESCHEDULED',
} as const;
export type AppointmentStatus =
  (typeof AppointmentStatus)[keyof typeof AppointmentStatus];

// Statuses that still hold a slot in the doctor's agenda.
export const BUSY_APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
];

export type AppointmentConstructorProps = {
  id?: AppointmentId;
  patientId: string;
  doctorId: string;
  date: Date;
  time: Date;
  reason: string;
  description?: string;
  status: AppointmentStatus;
  createdById?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type AppointmentCreateCommand = Omit<
  AppointmentConstructorProps,
  'id' | 'status' | 'createdAt' | 'updatedAt'
>;

export type AppointmentEditCommand = Omit<
  AppointmentCreateCommand,
  'createdById'
>;

export class Appointment extends AggregateRoot {
  id: AppointmentId;
  patientId: string;
  doctorId: string;
  date: Date;
  time: Date;
  reason: string;
  description?: string;
  status: AppointmentStatus;
  createdById?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: AppointmentConstructorProps) {
    super();
    Object.assign(this, {
      id: props.id ?? new AppointmentId(),
      patientId: props.patientId,
      doctorId: props.doctorId,
      date: props.date,
      time: props.time,
      reason: props.reason,
      description: props.description,
      status: props.status,
      createdById: props.createdById,
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    });
  }

  get entityId(): ValueObject {
    return this.id;
  }

  static create(command: AppointmentCreateCommand): Appointment {
    const appointment = new Appointment({
      ...command,
      reason: command.reason.trim(),
      description: Appointment.normalizeDescription(command.description),
      status: AppointmentStatus.CONFIRMED,
    });
    appointment.assertValid();
    return appointment;
  }

  get isOpen(): boolean {
    return BUSY_APPOINTMENT_STATUSES.includes(this.status);
  }

  isScheduledAt(doctorId: string, date: Date, time: Date): boolean {
    return (
      this.doctorId === doctorId &&
      this.date.getTime() === date.getTime() &&
      this.time.getTime() === time.getTime()
    );
  }

  assertCancellable(): void {
    if (!this.isOpen) {
      throw new AppointmentRuleViolationError(
        'Only pending or confirmed appointments can be cancelled',
      );
    }
  }

  assertCompletable(): void {
    if (this.status !== AppointmentStatus.CONFIRMED) {
      throw new AppointmentRuleViolationError(
        'Only confirmed appointments can be completed',
      );
    }
  }

  assertReschedulable(): void {
    if (!this.isOpen) {
      throw new AppointmentRuleViolationError(
        'Only pending or confirmed appointments can be rescheduled',
      );
    }
  }

  assertEditable(): void {
    if (!this.isOpen) {
      throw new AppointmentRuleViolationError(
        'Only pending or confirmed appointments can be edited',
      );
    }
  }

  cancel(): void {
    this.assertCancellable();
    this.changeStatus(AppointmentStatus.CANCELLED);
  }

  complete(): void {
    this.assertCompletable();
    this.changeStatus(AppointmentStatus.COMPLETED);
  }

  reschedule(date: Date, time: Date): void {
    this.assertReschedulable();
    this.date = date;
    this.time = time;
    this.changeStatus(AppointmentStatus.CONFIRMED);
    this.assertValid();
  }

  edit(command: AppointmentEditCommand): void {
    this.assertEditable();
    this.patientId = command.patientId;
    this.doctorId = command.doctorId;
    this.date = command.date;
    this.time = command.time;
    this.reason = command.reason.trim();
    this.description = Appointment.normalizeDescription(command.description);
    this.updatedAt = new Date();
    this.assertValid();
  }

  validate(fields?: string[]) {
    this.notification = new Notification();
    const validator = AppointmentValidatorFactory.create();
    return validator.validate(this.notification, this, fields);
  }

  assertValid(fields?: string[]): void {
    if (this.validate(fields)) return;
    const messages = this.notification
      .toJSON()
      .flatMap((error) =>
        typeof error === 'string' ? [error] : Object.values(error).flat(),
      );
    throw new AppointmentRuleViolationError(messages.join(', '));
  }

  toJSON() {
    return {
      id: this.id.value,
      patientId: this.patientId,
      doctorId: this.doctorId,
      date: this.date,
      time: this.time,
      reason: this.reason,
      description: this.description,
      status: this.status,
      createdById: this.createdById,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  private changeStatus(status: AppointmentStatus) {
    this.status = status;
    this.updatedAt = new Date();
  }

  private static normalizeDescription(description?: string) {
    return description?.trim() || undefined;
  }
}
