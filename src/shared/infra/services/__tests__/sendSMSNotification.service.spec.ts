import { SendSMSNotification } from '../sendSMSNotification.service';

describe('SendSMSNotification - Brazilian Phone Number Formatting', () => {
  let smsService: SendSMSNotification;

  beforeEach(() => {
    smsService = new SendSMSNotification();
  });

  describe('Brazilian Phone Number Formatting', () => {
    it('should format Brazilian mobile numbers without country code', () => {
      const testCases = [
        { input: '11952130888', expected: '+5511952130888' },
        { input: '21987654321', expected: '+5521987654321' },
        { input: '31987654321', expected: '+5531987654321' },
        { input: '41987654321', expected: '+5541987654321' },
        { input: '51987654321', expected: '+5551987654321' },
        { input: '61987654321', expected: '+5561987654321' },
        { input: '71987654321', expected: '+5571987654321' },
        { input: '81987654321', expected: '+5581987654321' },
        { input: '91987654321', expected: '+5591987654321' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = (smsService as any).formatBrazilianPhoneNumber(input);
        expect(result).toBe(expected);
      });
    });

    it('should format Brazilian landline numbers without country code', () => {
      const testCases = [
        { input: '1123456789', expected: '+551123456789' },
        { input: '2123456789', expected: '+552123456789' },
        { input: '3123456789', expected: '+553123456789' },
        { input: '4123456789', expected: '+554123456789' },
        { input: '5123456789', expected: '+555123456789' },
        { input: '6123456789', expected: '+556123456789' },
        { input: '7123456789', expected: '+557123456789' },
        { input: '8123456789', expected: '+558123456789' },
        { input: '9123456789', expected: '+559123456789' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = (smsService as any).formatBrazilianPhoneNumber(input);
        expect(result).toBe(expected);
      });
    });

    it('should handle numbers with existing country code', () => {
      const testCases = [
        { input: '5511952130888', expected: '+5511952130888' },
        { input: '5521987654321', expected: '+5521987654321' },
        { input: '551123456789', expected: '+551123456789' },
        { input: '552123456789', expected: '+552123456789' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = (smsService as any).formatBrazilianPhoneNumber(input);
        expect(result).toBe(expected);
      });
    });

    it('should handle numbers with spaces and special characters', () => {
      const testCases = [
        { input: '11 95213 0888', expected: '+5511952130888' },
        { input: '21 98765 4321', expected: '+5521987654321' },
        { input: '11 2345 6789', expected: '+551123456789' },
        { input: '21 2345 6789', expected: '+552123456789' },
        { input: '(11) 95213-0888', expected: '+5511952130888' },
        { input: '(21) 98765-4321', expected: '+5521987654321' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = (smsService as any).formatBrazilianPhoneNumber(input);
        expect(result).toBe(expected);
      });
    });

    it('should return original number for non-Brazilian numbers', () => {
      const testCases = [
        '123456789',
        '119521308888',
        '00952130888',
        'email@example.com',
        'abc123',
        '+1234567890', // US number
        '+447911123456', // UK number
      ];

      testCases.forEach(input => {
        const result = (smsService as any).formatBrazilianPhoneNumber(input);
        expect(result).toBe(input);
      });
    });
  });

  describe('Brazilian Phone Number Validation', () => {
    it('should validate Brazilian mobile numbers', () => {
      const validMobileNumbers = [
        '11952130888',
        '21987654321',
        '31987654321',
        '41987654321',
        '51987654321',
        '61987654321',
        '71987654321',
        '81987654321',
        '91987654321',
        '5511952130888', // with country code
      ];

      validMobileNumbers.forEach(number => {
        const result = (smsService as any).isValidBrazilianPhoneNumber(number);
        expect(result).toBe(true);
      });
    });

    it('should validate Brazilian landline numbers', () => {
      const validLandlineNumbers = [
        '1123456789',
        '2123456789',
        '3123456789',
        '4123456789',
        '5123456789',
        '6123456789',
        '7123456789',
        '8123456789',
        '9123456789',
        '551123456789', // with country code
      ];

      validLandlineNumbers.forEach(number => {
        const result = (smsService as any).isValidBrazilianPhoneNumber(number);
        expect(result).toBe(true);
      });
    });

    it('should reject invalid Brazilian phone numbers', () => {
      const invalidNumbers = [
        '123456789', // too short
        '119521308888', // too long
        '00952130888', // invalid DDD
        '1195213088', // invalid format
        '1195213088a', // contains letters
        'email@example.com', // email
        'abc123', // invalid format
      ];

      invalidNumbers.forEach(number => {
        const result = (smsService as any).isValidBrazilianPhoneNumber(number);
        expect(result).toBe(false);
      });
    });

    it('should handle numbers with spaces and special characters in validation', () => {
      const validNumbersWithFormatting = [
        '11 95213 0888',
        '21 98765 4321',
        '(11) 95213-0888',
        '(21) 98765-4321',
        '11.95213.0888',
        '21-98765-4321',
      ];

      validNumbersWithFormatting.forEach(number => {
        const result = (smsService as any).isValidBrazilianPhoneNumber(number);
        expect(result).toBe(true);
      });
    });
  });
}); 