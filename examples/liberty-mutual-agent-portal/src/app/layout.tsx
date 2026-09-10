import type { Metadata } from 'next';
import '@/styles/portal.css';
import '@/styles/cms.css';

export const metadata: Metadata = {
  title: { default: 'Liberty Mutual | Agent Portal', template: '%s | Liberty Mutual' },
  description: 'Your connected workspace for clients, coverage, and agency growth.',
  robots: { index: false, follow: false },
  icons: { icon: '/brand/liberty-mutual-symbol.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
