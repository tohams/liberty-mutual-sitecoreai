// Below are built-in components that are available in the app, it's recommended to keep them as is
import { NextjsContentSdkComponent } from '@sitecore-content-sdk/nextjs';


import { BYOCServerWrapper, FEaaSServerWrapper } from '@sitecore-content-sdk/nextjs';
import { Form } from '@sitecore-content-sdk/nextjs';

// end of built-in import section
import * as SharedDisclosure from 'src/components/shared-disclosure/SharedDisclosure';
import * as PublicSplitContent from 'src/components/public-split-content/PublicSplitContent';
import * as PublicSection from 'src/components/public-section/PublicSection';
import * as PublicSearch from 'src/components/public-search/PublicSearch';
import * as PublicQuoteHandoff from 'src/components/public-quote-handoff/PublicQuoteHandoff';
import * as PublicPromotion from 'src/components/public-promotion/PublicPromotion';
import * as PublicProductSelector from 'src/components/public-product-selector/PublicProductSelector';
import * as PublicPageBody from 'src/components/public-page-body/PublicPageBody';
import * as PublicImage from 'src/components/public-image/PublicImage';
import * as PublicHero from 'src/components/public-hero/PublicHero';
import * as PublicHeader from 'src/components/public-header/PublicHeader';
import * as PublicFooter from 'src/components/public-footer/PublicFooter';
import * as PublicFaq from 'src/components/public-faq/PublicFaq';
import * as PublicCta from 'src/components/public-cta/PublicCta';
import * as PublicBreadcrumbs from 'src/components/public-breadcrumbs/PublicBreadcrumbs';
import * as PublicArticle from 'src/components/public-article/PublicArticle';
import * as PublicApprovedAnswer from 'src/components/public-approved-answer/PublicApprovedAnswer';
import * as PartialDesignDynamicPlaceholder from 'src/components/partial-design-dynamic-placeholder/PartialDesignDynamicPlaceholder';

export const componentMap = new Map<string, NextjsContentSdkComponent>([
  ['BYOCWrapper', BYOCServerWrapper],
  ['FEaaSWrapper', FEaaSServerWrapper],
  ['Form', { ...Form, componentType: 'client' }],
  ['SharedDisclosure', { ...SharedDisclosure }],
  ['PublicSplitContent', { ...PublicSplitContent }],
  ['PublicSection', { ...PublicSection }],
  ['PublicSearch', { ...PublicSearch, componentType: 'client' }],
  ['PublicQuoteHandoff', { ...PublicQuoteHandoff, componentType: 'client' }],
  ['PublicPromotion', { ...PublicPromotion }],
  ['PublicProductSelector', { ...PublicProductSelector, componentType: 'client' }],
  ['PublicPageBody', { ...PublicPageBody }],
  ['PublicImage', { ...PublicImage }],
  ['PublicHero', { ...PublicHero }],
  ['PublicHeader', { ...PublicHeader, componentType: 'client' }],
  ['PublicFooter', { ...PublicFooter }],
  ['PublicFaq', { ...PublicFaq }],
  ['PublicCta', { ...PublicCta }],
  ['PublicBreadcrumbs', { ...PublicBreadcrumbs }],
  ['PublicArticle', { ...PublicArticle }],
  ['PublicApprovedAnswer', { ...PublicApprovedAnswer }],
  ['PartialDesignDynamicPlaceholder', { ...PartialDesignDynamicPlaceholder }],
]);

export default componentMap;
