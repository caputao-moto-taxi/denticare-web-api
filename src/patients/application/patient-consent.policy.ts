import { PatientConsentState } from '../domain/patient.repository';

type ConsentChanges = Partial<
  Pick<
    PatientConsentState,
    'dataProcessingConsent' | 'marketingEmailConsent' | 'marketingSmsConsent'
  >
>;

export function consentTimestamps(
  changes: ConsentChanges,
  previous: PatientConsentState,
  now = new Date(),
) {
  const timestamp = <K extends keyof ConsentChanges>(
    key: K,
    updatedAtKey: `${K}UpdatedAt`,
  ) => {
    const changed = changes[key];
    if (changed === undefined) return {};
    return {
      [updatedAtKey]: changed !== previous[key] ? now : previous[updatedAtKey],
    };
  };

  return {
    ...timestamp('dataProcessingConsent', 'dataProcessingConsentUpdatedAt'),
    ...timestamp('marketingEmailConsent', 'marketingEmailConsentUpdatedAt'),
    ...timestamp('marketingSmsConsent', 'marketingSmsConsentUpdatedAt'),
  } as Pick<
    PatientConsentState,
    | 'dataProcessingConsentUpdatedAt'
    | 'marketingEmailConsentUpdatedAt'
    | 'marketingSmsConsentUpdatedAt'
  >;
}
