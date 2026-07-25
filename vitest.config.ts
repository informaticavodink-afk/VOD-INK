import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: 'coverage',
      include: [
        'src/domain/consents/consentPdfSchema.ts',
        'src/domain/consents/artistConsentWorkflow.ts',
        'server/consentPdfData.ts',
        'src/lib/pdf.ts',
      ],
      exclude: [
        '**/*.test.ts',
        'api/**',
        'server/routes/**',
        'server/supabase.ts',
        'server/drive.ts',
        'utils/**',
        'src/main.tsx',
        'src/types/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 80,
        'src/domain/consents/consentPdfSchema.ts': {
          lines: 100,
          functions: 100,
          statements: 100,
          branches: 100,
        },
        'src/domain/consents/artistConsentWorkflow.ts': {
          lines: 100,
          functions: 100,
          statements: 100,
          branches: 100,
        },
        'server/consentPdfData.ts': {
          lines: 100,
          functions: 100,
          statements: 100,
          branches: 100,
        },
      },
    },
  },
});
