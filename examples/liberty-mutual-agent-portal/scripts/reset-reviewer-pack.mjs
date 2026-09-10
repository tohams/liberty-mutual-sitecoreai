const [url, reviewerPack, mode = 'saved-work'] = process.argv.slice(2);
if (!url || !/^0[1-4]$/.test(reviewerPack ?? '') || !['saved-work', 'restart'].includes(mode)) throw new Error('Usage: node scripts/reset-reviewer-pack.mjs https://portal-host 01 [saved-work|restart]');
if (!process.env.PORTAL_OPERATOR_SECRET) throw new Error('Set PORTAL_OPERATOR_SECRET in your shell.');
const target = new URL('/api/portal/operator/reset', url);
if (target.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(target.hostname)) throw new Error('Operator requests require HTTPS.');
const response = await fetch(target, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.PORTAL_OPERATOR_SECRET}` }, body: JSON.stringify({ reviewerPack, mode }) });
const result = await response.json();
if (!response.ok) throw new Error(result.error?.message ?? 'Reset failed.');
console.log(JSON.stringify(result, null, 2));
