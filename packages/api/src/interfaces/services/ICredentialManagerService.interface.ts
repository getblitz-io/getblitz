import type { BankCredentials, ProviderConfig } from "@getblitz/bank-providers";

export interface CredentialManagerResult {
  credentials: BankCredentials;
  wasRefreshed: boolean;
}

export interface ICredentialManagerService {
  getValidCredentials({
    connectionId,
  }: {
    connectionId: string;
  }): Promise<CredentialManagerResult>;
  isTokenExpiringSoon(
    credentials: BankCredentials,
    bufferMinutes?: number,
  ): boolean;
  encryptProviderConfig(config: ProviderConfig): string;
  decryptProviderConfig(encrypted: string): ProviderConfig;
  encryptCredentials(credentials: BankCredentials): string;
  decryptCredentials(encrypted: string): BankCredentials;
}
