import 'server-only';
import type { NextRequest } from 'next/server';
import type { PersonalizeProxyConfig } from '@sitecore-content-sdk/nextjs/proxy';

type PersonalizeGeoData = Awaited<ReturnType<NonNullable<PersonalizeProxyConfig['extractGeoDataCb']>>>;

function cityName(value: string | null): string | undefined {
  if (!value || value.length > 512) return undefined;
  try {
    const city = decodeURIComponent(value).trim();
    return city && city.length <= 160 && !/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/.test(city)
      ? city
      : undefined;
  } catch { return undefined; }
}

/** Only Vercel's hosted request metadata supplies visitor geography; local headers do not. */
export function extractPortalVisitorGeo(request?: Pick<NextRequest, 'headers'>): PersonalizeGeoData {
  if (process.env.VERCEL !== '1' || !request) return {};
  const country = request.headers.get('x-vercel-ip-country');
  if (!country || !/^[A-Z]{2}$/.test(country)) return {};
  const region = request.headers.get('x-vercel-ip-country-region');
  const validRegion = region && (country === 'US' ? /^[A-Z]{2}$/ : /^[A-Z0-9]{1,3}$/).test(region)
    ? region
    : undefined;
  const city = cityName(request.headers.get('x-vercel-ip-city'));
  return { country, ...(validRegion && { region: validRegion }), ...(city && { city }) };
}
