import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import next from 'eslint-config-next/core-web-vitals';

export default [
  { ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**', '.tools/**', '.npm-cache/**', '.pnpm-store/**', 'artifacts/**', '**/next-env.d.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...next.map((config) => ({ ...config, files: ['apps/web/**/*.{ts,tsx,js,mjs}'] })),
  { files: ['apps/web/**/*.{ts,tsx,js,mjs}'], settings: { next: { rootDir: 'apps/web/' } } },
];
