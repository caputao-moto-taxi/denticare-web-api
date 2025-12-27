import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  IsEnum,
  IsDate,
} from "class-validator";
import { TypeNotification } from "@prisma/client";
import { ErrorMessages } from "../../../../shared/helpers/errorMessages";

export type CreateNotificationInputConstructorProps = {
  type: string;
  receipts: string | number | Array<string | number>;
  title: string;
  body: string;
  scheduledAt?: Date;
  // applicationId: string;
  reScheduledAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  apiKey?: string;
};

@ValidatorConstraint({ name: "IsValidReceipts", async: false })
class IsValidReceiptsConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const object = args.object as any;
    const notificationType = object.type;

    const isValidEmail = (v: string) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

    const isValidBrazilianPhone = (v: string | number) => {
      const num = v.toString().replace(/\s+/g, "").replace(/[^\d]/g, "");
      
      // Remove código do país se presente
      let cleanNumber = num;
      if (num.startsWith('55')) {
        cleanNumber = num.substring(2);
      }
      
      // Validação para números brasileiros
      // DDD (2 dígitos) + número (8-9 dígitos)
      // Total: 10-11 dígitos (sem código do país)
      if (cleanNumber.length === 10 || cleanNumber.length === 11) {
        // Verifica se começa com 9 (celular) ou 2-8 (fixo)
        const ddd = cleanNumber.substring(0, 2);
        const number = cleanNumber.substring(2);
        
        // DDDs válidos no Brasil (11-99, exceto alguns)
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
        
        // Para celulares (começam com 9): 9 dígitos
        // Para fixos (começam com 2-8): 8 dígitos
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

export class CreateNotificationInput {
  @IsEnum(TypeNotification, { message: ErrorMessages.INVALID_NOTIFICATION_TYPE })
  @IsNotEmpty({ message: ErrorMessages.INVALID_NOTIFICATION_TYPE })
  type: string;

  @Validate(IsValidReceiptsConstraint)
  receipts: string | number | Array<string | number>;

  @IsString({ message: ErrorMessages.NOTIFICATION_TITLE_MUST_BE_STRING })
  @IsNotEmpty({ message: ErrorMessages.NOTIFICATION_TITLE_MUST_BE_STRING })
  title: string;

  @IsString({ message: ErrorMessages.NOTIFICATION_BODY_MUST_BE_STRING })
  @IsNotEmpty({ message: ErrorMessages.NOTIFICATION_BODY_MUST_BE_STRING })
  body: string;

  @IsOptional()
  @IsDate()
  scheduledAt?: Date;

  @IsOptional()
  reScheduledAt?: Date;

  @IsString()
  @IsOptional()
  apiKey?: string;

  constructor(props: CreateNotificationInputConstructorProps) {
    if (!props) return;
    this.type = props.type;
    this.receipts = props.receipts;
    this.title = props.title;
    this.body = props.body;
    this.scheduledAt = props.scheduledAt;
    this.reScheduledAt = props.reScheduledAt;
    this.apiKey = props.apiKey;
  }
}

export type SendEmailNotificationProps = {
  to: string[];
  subject: string;
  html?: string;
  text?: string;
}

export type SendSMSNotificationProps = {
  to: string | string[];
  body: string;
  title?: string;
}

export type SaveInternalNotificationProps = {
  id?: string;
  type: string;
  receipts: any;
  title: string;
  body: string;
  scheduledAt?: Date;
  applicationId: string;
  reScheduledAt?: Date;
  status: string;
}

export type SendPushNotificationProps = {
  to: string | string[];
  body: string;
  title?: string;
}

export type SendDiscordNotificationProps = {
  channelName: string;
  content: string;
}