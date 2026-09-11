import { defineCliConfig } from '@sitecore-content-sdk/nextjs/config-cli';
import {
  generateSites,
  generateMetadata,
  extractFiles,
  writeImportMap,
} from '@sitecore-content-sdk/nextjs/tools';
import scConfig from './sitecore.config';

export default defineCliConfig({
  config: scConfig,
  build: {
    commands: [
      generateMetadata(),
      generateSites(),
      extractFiles(),
      writeImportMap({
        paths: ['src/components'],
      }),
    ],
  },
  componentMap: {
    paths: ['src/components'],
    exclude: [
      'src/components/content-sdk/*',
      'src/components/atoms/**',
      'src/components/ui/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.fixture.ts',
      '**/*.fixture.tsx',
      '**/*.props.ts',
      '**/*.props.tsx',
      '**/*.schema.ts',
      'src/components/agent-guidance/guidance-risk-state.ts',
      'src/components/resource-search/resource-search-facets.ts',
    ],
  },
});
