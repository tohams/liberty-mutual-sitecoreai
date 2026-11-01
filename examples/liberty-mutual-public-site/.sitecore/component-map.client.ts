// Client-safe component map for App Router
import { NextjsContentSdkComponent } from '@sitecore-content-sdk/nextjs';


import { BYOCClientWrapper, FEaaSClientWrapper } from '@sitecore-content-sdk/nextjs';
import { Form } from '@sitecore-content-sdk/nextjs';

// end of built-in import section
import * as PublicSearch from 'src/components/public-search/PublicSearch';
import * as PublicQuoteHandoff from 'src/components/public-quote-handoff/PublicQuoteHandoff';
import * as PublicProductSelector from 'src/components/public-product-selector/PublicProductSelector';

export const componentMap = new Map<string, NextjsContentSdkComponent>([
  ['BYOCWrapper', BYOCClientWrapper],
  ['FEaaSWrapper', FEaaSClientWrapper],
  ['Form', Form],
  ['PublicSearch', { ...PublicSearch }],
  ['PublicQuoteHandoff', { ...PublicQuoteHandoff }],
  ['PublicProductSelector', { ...PublicProductSelector }],
]);

export default componentMap;
