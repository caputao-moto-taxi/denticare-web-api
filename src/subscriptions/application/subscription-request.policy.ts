import { BadRequestException, ConflictException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { Prisma } from '../../../generated/prisma/client';
import { PaymentProofUpload } from './payment-proof-upload';

const MAX_PROOF_SIZE = 5 * 1024 * 1024;
const ACCEPTED_PROOFS: Record<string, { mimeType: string; extension: string }> =
  {
    '.pdf': { mimeType: 'application/pdf', extension: '.pdf' },
    '.png': { mimeType: 'image/png', extension: '.png' },
    '.jpg': { mimeType: 'image/jpeg', extension: '.jpg' },
    '.jpeg': { mimeType: 'image/jpeg', extension: '.jpg' },
  };

export class SubscriptionRequestPolicy {
  static assertIdempotencyKey(key: string | undefined): asserts key is string {
    if (!key || !/^[A-Za-z0-9_-]{16,100}$/.test(key)) {
      throw new BadRequestException(
        'A valid Idempotency-Key header is required',
      );
    }
  }

  static assertValidProofUpload(
    file: PaymentProofUpload | undefined,
  ): asserts file is PaymentProofUpload {
    if (!file?.buffer?.length || !file.size) {
      throw new BadRequestException('A payment proof file is required');
    }
    if (
      file.size !== file.buffer.length ||
      file.size > MAX_PROOF_SIZE ||
      file.buffer.length > MAX_PROOF_SIZE
    ) {
      throw new BadRequestException('Payment proof must not exceed 5 MB');
    }
  }

  static validateProof(file: PaymentProofUpload) {
    const extension = extname(file.originalname).toLowerCase();
    const type = ACCEPTED_PROOFS[extension];
    if (!type?.mimeType || file.mimetype !== type.mimeType) {
      throw new BadRequestException(
        'Payment proof must be a PDF, PNG, JPG, or JPEG file',
      );
    }
    const signatureValid =
      (type.mimeType === 'application/pdf' &&
        file.buffer.subarray(0, 5).toString('ascii') === '%PDF-') ||
      (type.mimeType === 'image/png' &&
        file.buffer
          .subarray(0, 8)
          .equals(
            Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
          )) ||
      (type.mimeType === 'image/jpeg' &&
        file.buffer[0] === 0xff &&
        file.buffer[1] === 0xd8 &&
        file.buffer[2] === 0xff);
    if (!signatureValid) {
      throw new BadRequestException(
        'The uploaded payment proof does not match its declared file type',
      );
    }
    return {
      mimeType: type.mimeType,
      safeFileName: `${randomUUID()}${type.extension}`,
    };
  }

  static assertSameIdempotentRequest(
    existing: { planId: string; amountPaid: Prisma.Decimal },
    input: { planId: string; amountPaid: string },
  ) {
    if (
      existing.planId !== input.planId ||
      !existing.amountPaid.equals(input.amountPaid)
    ) {
      throw new ConflictException(
        'Idempotency-Key was already used for a different subscription request',
      );
    }
  }
}
