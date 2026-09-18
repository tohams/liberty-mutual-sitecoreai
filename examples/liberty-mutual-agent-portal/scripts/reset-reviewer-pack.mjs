import { readFile } from 'node:fs/promises';

const { reviewerPacks } = JSON.parse(await readFile(new URL('../fixtures/manifest.json', import.meta.url), 'utf8'));
const [url, reviewerPack, mode = 'saved-work'] = process.argv.slice(2);
if (!url || !reviewerPacks.includes(reviewerPack) || !['saved-work', 'restart'].includes(mode)) throw new Error(`Usage: node scripts/reset-reviewer-pack.mjs https://portal-host <${reviewerPacks.join('|')}> [saved-work|restart]`);
if (!process.env.PORTAL_OPERATOR_SECRET) throw new Error('Set PORTAL_OPERATOR_SECRET in your shell.');
const target = new URL('/api/portal/operator/reset', url);
if (target.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(target.hostname)) throw new Error('Operator requests require HTTPS.');
const response = await fetch(target, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.PORTAL_OPERATOR_SECRET}` }, body: JSON.stringify({ reviewerPack, mode }) });
const result = await response.json();
if (!response.ok) throw new Error(result.error?.message ?? 'Reset failed.');
console.log(JSON.stringify(result, null, 2));
