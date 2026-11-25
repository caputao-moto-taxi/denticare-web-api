import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { SubscriptionRequestPolicy } from './subscription-request.policy';

describe('SubscriptionRequestPolicy', () => {
  it('requires a valid idempotency key and distinguishes reused payloads', () => {
    expect(() =>
      SubscriptionRequestPolicy.assertIdempotencyKey('invalid'),
    ).toThrow(BadRequestException);
    expect(() =>
      SubscriptionRequestPolicy.assertIdempotencyKey('valid_key-12345678'),
    ).not.toThrow();

    expect(() =>
      SubscriptionRequestPolicy.assertSameIdempotentRequest(
        { planId: 'plan-1', amountPaid: new Prisma.Decimal('25.00') },
        { planId: 'plan-1', amountPaid: '25' } as never,
      ),
    ).not.toThrow();
    expect(() =>
      SubscriptionRequestPolicy.assertSameIdempotentRequest(
        { planId: 'plan-1', amountPaid: new Prisma.Decimal('25.00') },
        { planId: 'plan-2', amountPaid: '25' } as never,
      ),
    ).toThrow(ConflictException);
  });

  it('accepts a PDF only when its signature matches and generates a safe name', () => {
    const buffer = Buffer.from('%PDF-1.7\nproof');
    const file = {
      originalname: 'proof.pdf',
      mimetype: 'application/pdf',
      size: buffer.length,
      buffer,
    };

    SubscriptionRequestPolicy.assertValidProofUpload(file);
    expect(SubscriptionRequestPolicy.validateProof(file)).toEqual({
      mimeType: 'application/pdf',
      safeFileName: expect.stringMatching(/^[0-9a-f-]{36}\.pdf$/),
    });
    expect(() =>
      SubscriptionRequestPolicy.validateProof({
        ...file,
        buffer: Buffer.from('not a pdf'),
        size: 9,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects missing and oversized proof uploads', () => {
    expect(() =>
      SubscriptionRequestPolicy.assertValidProofUpload(undefined),
    ).toThrow(BadRequestException);
    expect(() =>
      SubscriptionRequestPolicy.assertValidProofUpload({
        originalname: 'proof.pdf',
        mimetype: 'application/pdf',
        size: 5 * 1024 * 1024 + 1,
        buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
      }),
    ).toThrow(BadRequestException);
  });
});
