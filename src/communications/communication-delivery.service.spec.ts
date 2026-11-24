import { CommunicationDeliveryService } from './communication-delivery.service';
import type { SendMailServiceUseCase } from '../shared/infra/services/sendEmailNotification.service';

describe('CommunicationDeliveryService phone numbers', () => {
  it('accepts E.164 and local Angola mobile numbers', () => {
    expect(
      CommunicationDeliveryService.isValidContact('SMS', '+244923000001'),
    ).toBe(true);
    expect(
      CommunicationDeliveryService.isValidContact('SMS', '923000001'),
    ).toBe(true);
    expect(
      CommunicationDeliveryService.isValidContact('SMS', '244 923 000 002'),
    ).toBe(true);
    expect(CommunicationDeliveryService.isValidContact('SMS', '12')).toBe(
      false,
    );
  });

  it('normalizes local Angola numbers to E.164', () => {
    expect(
      CommunicationDeliveryService.normalizeContact('SMS', '923000001'),
    ).toBe('+244923000001');
    expect(
      CommunicationDeliveryService.normalizeContact('SMS', '+244923000001'),
    ).toBe('+244923000001');
  });

  it('renders campaign email through the branded HTML template', async () => {
    const mailService = { execute: jest.fn().mockResolvedValue(true) };
    const service = new CommunicationDeliveryService(
      mailService as unknown as SendMailServiceUseCase,
    );

    await service.sendEmail(
      ['first@example.test', 'second@example.test'],
      'Clinic update',
      'A clinic announcement',
    );

    expect(mailService.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        bcc: ['first@example.test', 'second@example.test'],
        subject: 'Clinic update',
        text: 'A clinic announcement',
        html: expect.stringContaining('A clinic announcement'),
      }),
    );
    const [{ html }] = mailService.execute.mock.calls[0];
    expect(html).toContain('data:image/png;base64,');
    expect(html).not.toMatch(/{{[^}]+}}/);
  });
});
