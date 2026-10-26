export abstract class CommunicationDeliveryGateway {
  abstract sendEmail(
    recipients: string[],
    subject: string,
    body: string,
  ): Promise<void>;
  abstract sendSmsBatch(recipients: string[], body: string): Promise<boolean[]>;
}
