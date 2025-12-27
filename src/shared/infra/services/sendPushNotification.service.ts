import admin from 'firebase-admin';
import { Message } from 'firebase-admin/lib/messaging/messaging-api';
import { GetEnviromentVariable } from '../azure';
import {
  errorResponse,
  successResponse,
  type HttpResponse,
} from '../../contracts/httpContracts';

let isFirebaseInitialized = false;

async function initializeFirebase(): Promise<void> {
  if (!isFirebaseInitialized) {
    const serviceAccount = JSON.parse(
      await GetEnviromentVariable('FIREBASE_SERVICE_ACCOUNT_KEY'),
    );

    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      isFirebaseInitialized = true;
    } catch (err: any) {
      if (!/already exists/i.test(err.message)) {
        throw err;
      }
    }
  }
}

export class SendPushNotificationService {
  async execute(
    token: string,
    title: string,
    body: string,
  ): Promise<HttpResponse<any>> {
    try {
      await initializeFirebase();

      const message: Message = {
        token,
        notification: { title, body },
      };

      const result = await admin.messaging().send(message);

      return successResponse({
        message: 'Push notification enviada com sucesso',
        responseId: result,
      });
    } catch (error: any) {
      return errorResponse(error);
    }
  }
}
