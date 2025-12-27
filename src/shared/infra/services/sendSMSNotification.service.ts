import * as twilio from "twilio";
import { errorResponse, successResponse } from "../../contracts/httpContracts";
import { GetEnviromentVariable } from "../azure";

export interface ITwilioProps {
  to: string | string[];
  body: string;
}

export class SendSMSNotification {
  private formatBrazilianPhoneNumber(phoneNumber: string): string {
    let cleanNumber = phoneNumber.replace(/\s+/g, "").replace(/[^\d]/g, "");
    
    if (cleanNumber.startsWith('55')) {
      return `+${cleanNumber}`;
    }
    
    if (cleanNumber.length === 10 || cleanNumber.length === 11) {
      return `+55${cleanNumber}`;
    }
    
    if (cleanNumber.length === 12 || cleanNumber.length === 13) {
      return `+${cleanNumber}`;
    }
    
    return phoneNumber;
  }

  private isValidBrazilianPhoneNumber(phoneNumber: string): boolean {
    const cleanNumber = phoneNumber.replace(/\s+/g, "").replace(/[^\d]/g, "");
  
    let numberWithoutCountry = cleanNumber;
    if (cleanNumber.startsWith('55')) {
      numberWithoutCountry = cleanNumber.substring(2);
    }
  
    if (numberWithoutCountry.length === 10 || numberWithoutCountry.length === 11) {
      const ddd = numberWithoutCountry.substring(0, 2);
      const number = numberWithoutCountry.substring(2);
      
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
  }

  async execute({ to, body }: ITwilioProps) {
    try {
      const accountSid = await GetEnviromentVariable('TWILIO_ACCOUNT_SID')! ?? 'AC7c431b8ae20e647295dbac9adb52db0f';
      const authToken = await GetEnviromentVariable('TWILIO_AUTH_TOKEN')! ?? '8fb1fd581b4e7f77e62c727ed6a5c6d8';
      const from = await GetEnviromentVariable('TWILIO_FROM_NUMBER')! ?? '+5511952130888';

      const client = twilio(accountSid!, authToken!);

      const recipients = Array.isArray(to) ? to : [to];
      
      const formattedRecipients = recipients.map(recipient => {
        if (this.isValidBrazilianPhoneNumber(recipient)) {
          return this.formatBrazilianPhoneNumber(recipient);
        }
        return recipient;
      });

      const responses = await Promise.all(
        formattedRecipients.map((recipient) =>
          client.messages.create({
            body,
            from: from!,
            to: recipient,
          })
        )
      );

      console.log("Res =====", responses);
      return successResponse({
        message: `SMS enviado para ${recipients.length} destinatário(s) com sucesso.`,
        results: responses,
      });
    } catch (error: any) {
      return errorResponse(error);
    }
  }
}
