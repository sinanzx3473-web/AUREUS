import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { logger } from '../utils/logger';

/**
 * Secrets Management Configuration
 * 
 * Supports multiple secret backends:
 * - AWS Secrets Manager (production)
 * - HashiCorp Vault (production)
 * - Environment variables (development/test)
 * 
 * CRITICAL: Production MUST use vault backend, never raw .env files
 */

export type SecretBackend = 'aws-secrets-manager' | 'vault' | 'env';

interface SecretsConfig {
  backend: SecretBackend;
  awsRegion?: string;
  vaultAddr?: string;
  vaultToken?: string;
  vaultPath?: string;
}

class SecretsManager {
  private backend: SecretBackend;
  private awsClient?: SecretsManagerClient;
  private vaultAddr?: string;
  private vaultToken?: string;
  private vaultPath?: string;
  private cache: Map<string, { value: string; expiry: number }> = new Map();
  private cacheTTL = 300000; // 5 minutes

  constructor(config: SecretsConfig) {
    this.backend = config.backend;

    // Validate production requirements
    if (process.env.NODE_ENV === 'production' && this.backend === 'env') {
      throw new Error(
        'CRITICAL SECURITY ERROR: Production MUST use vault backend (aws-secrets-manager or vault), not raw environment variables'
      );
    }

    // Initialize AWS Secrets Manager
    if (this.backend === 'aws-secrets-manager') {
      if (!config.awsRegion) {
        throw new Error('AWS_REGION is required for aws-secrets-manager backend');
      }
      this.awsClient = new SecretsManagerClient({ region: config.awsRegion });
      logger.info('Initialized AWS Secrets Manager backend', { region: config.awsRegion });
    }

    // Initialize HashiCorp Vault
    if (this.backend === 'vault') {
      if (!config.vaultAddr || !config.vaultToken) {
        throw new Error('VAULT_ADDR and VAULT_TOKEN are required for vault backend');
      }
      this.vaultAddr = config.vaultAddr;
      this.vaultToken = config.vaultToken;
      this.vaultPath = config.vaultPath || 'secret/takumi';
      logger.info('Initialized HashiCorp Vault backend', { addr: this.vaultAddr, path: this.vaultPath });
    }

    // Log environment variable backend (dev/test only)
    if (this.backend === 'env') {
      logger.warn('Using environment variable backend - ONLY for development/test');
    }
  }

  /**
   * Get secret value from configured backend
   * @param key Secret key/name
   * @returns Secret value
   */
  async getSecret(key: string): Promise<string> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }

    let value: string;

    switch (this.backend) {
      case 'aws-secrets-manager':
        value = await this.getFromAWS(key);
        break;
      case 'vault':
        value = await this.getFromVault(key);
        break;
      case 'env':
        value = this.getFromEnv(key);
        break;
      default:
        throw new Error(`Unknown secret backend: ${this.backend}`);
    }

    // Cache the value
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.cacheTTL,
    });

    return value;
  }

  /**
   * Get secret from AWS Secrets Manager
   */
  private async getFromAWS(secretName: string): Promise<string> {
    if (!this.awsClient) {
      throw new Error('AWS Secrets Manager client not initialized');
    }

    try {
      const command = new GetSecretValueCommand({ SecretId: secretName });
      const response = await this.awsClient.send(command);

      if (response.SecretString) {
        return response.SecretString;
      }

      throw new Error(`Secret ${secretName} has no SecretString value`);
    } catch (error) {
      logger.error('Failed to retrieve secret from AWS Secrets Manager', { secretName, error });
      throw new Error(`Failed to retrieve secret: ${secretName}`);
    }
  }

  /**
   * Get secret from HashiCorp Vault
   */
  private async getFromVault(key: string): Promise<string> {
    if (!this.vaultAddr || !this.vaultToken) {
      throw new Error('Vault client not initialized');
    }

    try {
      const url = `${this.vaultAddr}/v1/${this.vaultPath}`;
      const response = await fetch(url, {
        headers: {
          'X-Vault-Token': this.vaultToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Vault request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      const value = data.data?.data?.[key] || data.data?.[key];

      if (!value) {
        throw new Error(`Secret key ${key} not found in Vault path ${this.vaultPath}`);
      }

      return value;
    } catch (error) {
      logger.error('Failed to retrieve secret from Vault', { key, path: this.vaultPath, error });
      throw new Error(`Failed to retrieve secret: ${key}`);
    }
  }

  /**
   * Get secret from environment variables (dev/test only)
   */
  private getFromEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Environment variable ${key} is not set`);
    }
    return value;
  }

  /**
   * Clear cache for a specific key or all keys
   */
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}

// Initialize secrets manager based on environment
const getSecretsConfig = (): SecretsConfig => {
  const backend = (process.env.SECRETS_BACKEND as SecretBackend) || 'env';

  const config: SecretsConfig = { backend };

  if (backend === 'aws-secrets-manager') {
    config.awsRegion = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
  }

  if (backend === 'vault') {
    config.vaultAddr = process.env.VAULT_ADDR;
    config.vaultToken = process.env.VAULT_TOKEN;
    config.vaultPath = process.env.VAULT_PATH;
  }

  return config;
};

export const secretsManager = new SecretsManager(getSecretsConfig());

/**
 * Helper function to get required secret
 * Throws if secret is not found
 */
export async function getRequiredSecret(key: string): Promise<string> {
  try {
    return await secretsManager.getSecret(key);
  } catch (error) {
    logger.error(`Required secret ${key} not found`, { error });
    throw new Error(`Required secret ${key} is missing`);
  }
}

/**
 * Helper function to get optional secret
 * Returns undefined if not found
 */
export async function getOptionalSecret(key: string): Promise<string | undefined> {
  try {
    return await secretsManager.getSecret(key);
  } catch (error) {
    logger.debug(`Optional secret ${key} not found`, { error });
    return undefined;
  }
}
