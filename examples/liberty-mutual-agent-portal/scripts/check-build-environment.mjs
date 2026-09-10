#!/usr/bin/env node
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// Match Next's production build precedence locally; Vercel supplies process env directly.
require('@next/env').loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const required = ['SITECORE_EDGE_CONTEXT_ID', 'NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID'];
const checks = Object.fromEntries(required.map((name) => {
  const value = process.env[name] ?? '';
  return [name, { present: value.trim().length > 0, surroundingWhitespace: value !== value.trim() }];
}));
const separateContexts = process.env.SITECORE_EDGE_CONTEXT_ID !== process.env.NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID;
console.log('[Portal build configuration]', JSON.stringify({
  environment: ['production', 'preview', 'development'].includes(process.env.VERCEL_ENV) ? process.env.VERCEL_ENV : 'local-or-ci',
  checks,
  separateContexts,
}));
if (!separateContexts || Object.values(checks).some((check) => !check.present || check.surroundingWhitespace)) {
  console.error('Configure distinct private server and scoped browser Context IDs without surrounding whitespace. Values are deliberately never logged.');
  process.exitCode = 1;
}
