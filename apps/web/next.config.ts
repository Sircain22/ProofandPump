import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { NextConfig } from 'next';
const env = resolve(import.meta.dirname, '../../.env');
if (existsSync(env)) loadEnvFile(env);
const config: NextConfig = { transpilePackages: ['@proof/shared'], turbopack: { root: resolve(import.meta.dirname, '../..') } };
export default config;
