import { CommunicationDeliveryService } from './communication-delivery.service';

describe('CommunicationDeliveryService phone numbers', () => {
  it('accepts E.164 and local Angola mobile numbers', () => {
    expect(
      CommunicationDeliveryService.isValidContact('SMS', '+244923000001'),
    ).toBe(true);
    expect(CommunicationDeliveryService.isValidContact('SMS', '923000001')).toBe(
      true,
    );
    expect(
      CommunicationDeliveryService.isValidContact('SMS', '244 923 000 002'),
    ).toBe(true);
    expect(CommunicationDeliveryService.isValidContact('SMS', '12')).toBe(
      false,
    );
  });

  it('normalizes local Angola numbers to E.164', () => {
    expect(CommunicationDeliveryService.normalizeContact('SMS', '923000001')).toBe(
      '+244923000001',
    );
    expect(
      CommunicationDeliveryService.normalizeContact('SMS', '+244923000001'),
    ).toBe('+244923000001');
  });
});
