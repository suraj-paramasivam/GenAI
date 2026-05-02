import { vi } from 'vitest';

// Mock Secret Manager
vi.mock('@google-cloud/secret-manager', () => {
  return {
    SecretManagerServiceClient: vi.fn().mockImplementation(() => ({
      accessSecretVersion: vi.fn().mockImplementation(({ name }) => {
        if (name.includes('app-username')) {
          return [{ payload: { data: Buffer.from('testuser') } }];
        }
        if (name.includes('app-password')) {
          return [{ payload: { data: Buffer.from('testpass') } }];
        }
        if (name.includes('gemini-api-key')) {
          return [{ payload: { data: Buffer.from('fake-key') } }];
        }
        throw new Error('Secret not found');
      }),
    })),
  };
});

// Mock fetch globally
global.fetch = vi.fn();
