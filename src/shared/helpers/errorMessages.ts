export enum ErrorMessages {
  APPLICATION_ALREADY_EXISTS = 'Applicação com esse nome já existe.',
  SCHEDULED_DATE_NOTIFICATION_INVALID = 'Data de agendamento inválida.',
  INVALID_NOTIFICATION_TYPE = 'Tipo de notificação inválido.',
  NOTIFICATION_TITLE_MUST_BE_STRING = 'Título deve ser uma string.',
  NOTIFICATION_BODY_MUST_BE_STRING = 'Corpo deve ser uma string.',
  NOTIFICATION_APPLICATION_ID_MUST_BE_STRING = 'applicationId deve ser um uuid.',
  INVALID_KEY_OR_APPLICATION_NOT_FOUND = 'Chave inválida ou aplicação não encontrada.',
  INVALID_EMAIL = 'Email inválido.',
  LOGS_NOT_FOUND = 'Logs não encontrados.',
}