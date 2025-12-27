import { EmailClient } from "@azure/communication-email";
import { GetEnviromentVariable } from "../azure";
import { errorResponse, successResponse } from "../../contracts/httpContracts";
import { ReadHTMLFile } from "../../helpers/utils";

export class SendEmailNotificationService {
  async execute(to: string[], subject: string, html?: string, text?: string) {
    try {
      const emailClient = new EmailClient(
        await GetEnviromentVariable("AZURE_EMAIL_CONNECTION_STRING")!
      );

      const poller = await emailClient.beginSend({
        senderAddress: await GetEnviromentVariable("EMAIL_SENDER")!,
        replyTo: [{ address: await GetEnviromentVariable("EMAIL_SENDER")! }],
        content: {
          subject,
          plainText: text,
          html,
        },
        recipients: {
          to: to.map((email) => ({ address: email })),
        },
      });

      const result = await poller.pollUntilDone();

      return successResponse({
        status: result.status,
        messageId: result.id,
      });

    } catch (error: any) {
      return errorResponse(error);
    }
  }
}
