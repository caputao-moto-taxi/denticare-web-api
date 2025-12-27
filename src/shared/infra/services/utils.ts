import admin from 'firebase-admin';
import { Message } from 'firebase-admin/lib/messaging/messaging-api';
import { GetEnviromentVariable } from '../azure';

export class SendDataNotificationService {
  async execute(token: string, data: { [key: string]: any }) {
    const serviceAccount = JSON.parse(
      await GetEnviromentVariable('FIREBASE_SERVICE_ACCOUNT_KEY'),
    );

    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (e) {
      console.log('Firebase já inicializado');
    }

    const message: Message = {
      token,
      data,
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
          },
        },
      },
    };

    return admin
      .messaging()
      .send(message)
      .then((response) => {
        console.log('Sucesso:', response);
        return response;
      })
      .catch((error) => {
        console.error('Erro ao enviar data notification:', error);
        throw error;
      });
  }
}
