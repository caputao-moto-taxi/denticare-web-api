import { CreateNotificationInput } from '../notification.input';
import { TypeNotification } from '@prisma/client';

describe('Notification Validation - Brazilian Phone Numbers for SMS', () => {
  describe('SMS Validation', () => {
    it('should accept valid Brazilian mobile numbers for SMS', () => {
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
        '5511952130888',
      ];

      validMobileNumbers.forEach(number => {
        const input = new CreateNotificationInput({
          type: TypeNotification.SMS,
          receipts: [number],
          title: 'Test SMS',
          body: 'Test message',
        });

        expect(input.type).toBe(TypeNotification.SMS);
        expect(input.receipts).toContain(number);
      });
    });

    it('should accept valid Brazilian landline numbers for SMS', () => {
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
        '551123456789',
      ];

      validLandlineNumbers.forEach(number => {
        const input = new CreateNotificationInput({
          type: TypeNotification.SMS,
          receipts: [number],
          title: 'Test SMS',
          body: 'Test message',
        });

        expect(input.type).toBe(TypeNotification.SMS);
        expect(input.receipts).toContain(number);
      });
    });

    it('should reject invalid Brazilian phone numbers for SMS', () => {
      const invalidNumbers = [
        '123456789',
        '119521308888',
        '00952130888',
        '1195213088',
        '1195213088a',
        '1195213088 ',
        '1195213088-',
        'email@example.com',
        'abc123',
      ];

      invalidNumbers.forEach(number => {
        expect(() => {
          new CreateNotificationInput({
            type: TypeNotification.SMS,
            receipts: [number],
            title: 'Test SMS',
            body: 'Test message',
          });
        }).toThrow();
      });
    });

    it('should accept mixed valid numbers in array for SMS', () => {
      const validNumbers = ['11952130888', '21987654321', '1123456789'];
      
      const input = new CreateNotificationInput({
        type: TypeNotification.SMS,
        receipts: validNumbers,
        title: 'Test SMS',
        body: 'Test message',
      });

      expect(input.type).toBe(TypeNotification.SMS);
      expect(input.receipts).toEqual(validNumbers);
    });

    it('should reject array with invalid numbers for SMS', () => {
      const mixedNumbers = ['11952130888', 'invalid-number', '21987654321'];
      
      expect(() => {
        new CreateNotificationInput({
          type: TypeNotification.SMS,
          receipts: mixedNumbers,
          title: 'Test SMS',
          body: 'Test message',
        });
      }).toThrow();
    });
  });

  describe('Non-SMS Validation', () => {
    it('should accept emails for EMAIL type', () => {
      const input = new CreateNotificationInput({
        type: TypeNotification.EMAIL,
        receipts: ['test@example.com'],
        title: 'Test Email',
        body: 'Test message',
      });

      expect(input.type).toBe(TypeNotification.EMAIL);
      expect(input.receipts).toEqual(['test@example.com']);
    });

    it('should accept phone numbers for non-SMS types', () => {
      const input = new CreateNotificationInput({
        type: TypeNotification.PUSH,
        receipts: ['11952130888'],
        title: 'Test Push',
        body: 'Test message',
      });

      expect(input.type).toBe(TypeNotification.PUSH);
      expect(input.receipts).toEqual(['11952130888']);
    });

    it('should accept emails for non-SMS types', () => {
      const input = new CreateNotificationInput({
        type: TypeNotification.DISCORD,
        receipts: ['test@example.com'],
        title: 'Test Discord',
        body: 'Test message',
      });

      expect(input.type).toBe(TypeNotification.DISCORD);
      expect(input.receipts).toEqual(['test@example.com']);
    });
  });
}); 