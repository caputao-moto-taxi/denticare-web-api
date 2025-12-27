import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';

export const GetEnviromentVariable = async(name: string): Promise<string> => {
  const localValue = process.env[name];
  if (localValue) {
    return localValue;
  }

  try {
    const credential = new DefaultAzureCredential();

    const keyVaultName = process.env['KEY_VAULT_NAME']!;

    if (!keyVaultName) {
      throw new Error('KEY_VAULT_NAME is empty');
    }

    const url = `https://${keyVaultName}.vault.azure.net`;

    const client = new SecretClient(url, credential);

    const secretName = name.replace(/_/g, '-');

    const secret = await client.getSecret(secretName);

    return secret.value;
  } catch (error) {
    console.log(error);

    throw Error(
      `Error retrieving environment variable from Azure Key Vault. ENV: ${name}`,
    );
  }
}
