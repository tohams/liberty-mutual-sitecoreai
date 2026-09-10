import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

const root = new URL('../fixtures/', import.meta.url);
const read = async (name) => JSON.parse(await readFile(new URL(name, root), 'utf8'));
const agents = await read('agents.json');
const agencies = await read('agencies.json');
const manifest = await read('manifest.json');
const outputDirectory = resolve(process.argv[2] ?? 'fixtures/udl');
await mkdir(outputDirectory, { recursive: true });
const records = [];
const mapping = [];
for (const pack of manifest.reviewerPacks) {
  for (const agent of agents) {
    const agency = agencies.find((entry) => entry.id === agent.agencyId);
    for (let generation = 0; generation < 4; generation++) {
      const id = createHash('sha256').update(`liberty-mutual-agent:v1:${pack}:${agent.id}:${generation}`).digest('hex').slice(0, 32);
      const extensions = {
        agentId: agent.id, agencyId: agency.id, agencyName: agency.name, role: agent.role,
        state: agent.state, channel: agency.channel, reviewerPack: pack, profileGeneration: generation,
        productionPeriodStart: manifest.productionPeriod.start, productionPeriodEnd: manifest.productionPeriod.end,
        productionCurrency: 'USD', productionMetricScope: 'agency', scenarioAsOfDate: manifest.asOfDate,
        smallBusinessGrowthAudience: agency.id === 'cedar-ridge',
        licensedInTexas: agent.licensedStates.includes('TX'),
        licensedInFlorida: agent.licensedStates.includes('FL'),
        licensedInIllinois: agent.licensedStates.includes('IL'),
      };
      for (const line of ['personal', 'small-commercial', 'commercial', 'specialty', 'surety']) {
        const production = agency.production.find((entry) => entry.line === line);
        const prefix = line.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        extensions[`${prefix}WrittenPremiumCents`] = production?.writtenPremiumCents ?? 0;
        extensions[`${prefix}PolicyCount`] = production?.policyCount ?? 0;
        extensions[`${prefix}NewBusinessPremiumCents`] = production?.newBusinessPremiumCents ?? 0;
        const capitalized = prefix[0].toUpperCase() + prefix.slice(1);
        extensions[`specializesIn${capitalized}`] = agent.specializations.includes(line);
        extensions[`agency${capitalized}WrittenPremiumCents`] = production?.writtenPremiumCents ?? 0;
        const agentProduction = agent.production.find((entry) => entry.line === line);
        extensions[`agent${capitalized}WrittenPremiumCents`] = agentProduction?.writtenPremiumCents ?? 0;
        extensions[`agent${capitalized}PolicyCount`] = agentProduction?.policyCount ?? 0;
        extensions[`agent${capitalized}NewBusinessPremiumCents`] = agentProduction?.newBusinessPremiumCents ?? 0;
      }
      records.push({ id: randomUUID(), recordType: 'profile', identifiers: [{ provider: 'liberty-mutual-agent', id }], contact: { firstName: agent.firstName, lastName: agent.lastName }, extensions });
      mapping.push({ username: `${agent.id}.${pack}`, reviewerPack: pack, agentId: agent.id, generation, provider: 'liberty-mutual-agent', identifier: id });
    }
  }
}
await writeFile(resolve(outputDirectory, 'liberty-mutual-profiles.jsonl'), records.map((record) => JSON.stringify(record)).join('\n') + '\n');
await writeFile(resolve(outputDirectory, 'profile-identity-map.json'), JSON.stringify({ schemaVersion: 1, mapping }, null, 2) + '\n');
console.log(`Exported ${records.length} profiles across four packs and four generations; no credentials or email identifiers included.`);
