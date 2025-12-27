import { ApiProperty } from '@nestjs/swagger';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { TypeNotification } from '@prisma/client';

@ValidatorConstraint({ name: "IsValidReceiptsForType", async: false })
class IsValidReceiptsForTypeConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const object = args.object as any;
    const notificationType = object.type;

    const isValidEmail = (v: string) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

    const isValidBrazilianPhone = (v: string | number) => {
      const num = v.toString().replace(/\s+/g, "").replace(/[^\d]/g, "");
      
      let cleanNumber = num;
      if (num.startsWith('55')) {
        cleanNumber = num.substring(2);
      }
      
      if (cleanNumber.length === 10 || cleanNumber.length === 11) {
        const ddd = cleanNumber.substring(0, 2);
        const number = cleanNumber.substring(2);
        
        const validDDDs = [
          '11', '12', '13', '14', '15', '16', '17', '18', '19',
          '21', '22', '24', '27', '28',
          '31', '32', '33', '34', '35', '37', '38',
          '41', '42', '43', '44', '45', '46', '47', '48', '49',
          '51', '53', '54', '55',
          '61', '62', '63', '64', '65', '66', '67', '68', '69',
          '71', '73', '74', '75', '77', '79',
          '81', '82', '83', '84', '85', '86', '87', '88', '89',
          '91', '92', '93', '94', '95', '96', '97', '98', '99'
        ];
        
        if (!validDDDs.includes(ddd)) {
          return false;
        }
        
        if (number.startsWith('9')) {
          return number.length === 9;
        } else if (/^[2-8]/.test(number)) {
          return number.length === 8;
        }
      }
      
      return false;
    };

    const isValidPhone = (v: string | number) => {
      const num = v.toString().replace(/\s+/g, "");
      return /^[0-9]{9,15}$/.test(num); // Apenas números entre 9 e 15 dígitos
    };

    const isValid = (item: string | number) => {
      if (typeof item !== "string" && typeof item !== "number") {
        return false;
      }

      // Se for SMS, valida apenas números brasileiros
      if (notificationType === TypeNotification.SMS) {
        return isValidBrazilianPhone(item);
      }

      // Para outros tipos, aceita email ou telefone genérico
      return isValidEmail(item.toString()) || isValidPhone(item);
    };

    if (Array.isArray(value)) {
      return value.every(isValid);
    }

    return isValid(value);
  }

  defaultMessage(args: ValidationArguments) {
    const object = args.object as any;
    const notificationType = object.type;

    if (notificationType === TypeNotification.SMS) {
      return "Para SMS, receipts deve conter apenas números brasileiros válidos (DDD + número)";
    }

    return "receipts must be a valid email, phone number, or an array of emails/phone numbers";
  }
}

export class CreateNotificationDto {
  @IsNotEmpty({ message: 'Notification type is required' })
  @IsEnum(TypeNotification, { message: 'Invalid notification type' })
  @ApiProperty({ example: 'SMS', enum: TypeNotification })
  type: string;

  @IsNotEmpty({ message: 'Receipts are required' })
  @Validate(IsValidReceiptsForTypeConstraint)
  @ApiProperty({ 
    example: ['luiscaputo.dev@gmail.com'], 
    type: [String], 
    description: 'Receipts can be a string or an array of strings. For SMS, only valid Brazilian phone numbers are accepted.' 
  })
  @ValidateIf((obj) => typeof obj.receipts === 'string' || typeof obj.receipts === 'number')
  receipts: string | number | Array<string | number>;

  @IsNotEmpty({ message: 'Notification title is required' })
  @IsString({ message: 'Notification title must be a string' })
  @ApiProperty({ example: 'Notification Title' })
  title: string;

  @IsNotEmpty({ message: 'Notification body is required' })
  @IsString({ message: 'Notification body must be a string' })
  @ApiProperty({ example: 'A vida é dura' })
  body: string;

  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : value))
  @ApiProperty({ example: new Date(), required: false })
  @IsDate({ message: 'Scheduled date must be a valid date' })
  scheduledAt?: Date;
}
