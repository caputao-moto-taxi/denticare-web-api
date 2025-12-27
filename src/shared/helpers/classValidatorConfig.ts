import { ValidationError, validate } from 'class-validator';

const DEFAULT_ERROR_SEPARATOR = '; ';
export class ClassValidatorHelper {
  static validationErrorToPlain(error: ValidationError) {
    const msgError =
      error.constraints && Object.keys(error.constraints).length > 0
        ? Object.keys(error.constraints).map((key) => error.value[key] || '')
        : [];

    if (error.children && error.children.length > 0) {
      return error.children.reduce((messageErrors, currentError) => {
        console.log(messageErrors, currentError);
        return [...messageErrors, ...this.validationErrorToPlain(currentError)];
      }, msgError);
    }

    return msgError;
  }

  static validationErrorsToPlain(validationErrors: ValidationError[] = []) {
    if (validationErrors && validationErrors.length > 0) {
      return validationErrors.reduce((messageErrors: any[], currentError) => {
        return [...messageErrors, ...this.validationErrorToPlain(currentError)];
      }, [] as never[]);
    }
    return [];
  }

  static validationErrorsToString(
    validationErrors: ValidationError[] = [],
    errorSeparator = DEFAULT_ERROR_SEPARATOR,
  ) {
    return this.validationErrorsToPlain(validationErrors).join(errorSeparator);
  }

  static async validate(
    input: object,
    errorSeparator = DEFAULT_ERROR_SEPARATOR,
  ) {
    const validationsErrors = await validate(input, { whitelist: true });

    const errorMessages = this.validationErrorsToPlain(validationsErrors);

    if (errorMessages.length > 0) {
      return errorMessages.join(errorSeparator);
    }

    return true;
  }
}
