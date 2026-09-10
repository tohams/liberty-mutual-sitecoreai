'use client';
import Link from 'next/link';
import Image from 'next/image';

export default function PortalErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <main className="portal-status-page"><Image src="/brand/liberty-mutual-horizontal.svg" width={180} height={47} alt="Liberty Mutual"/><h1>We couldn’t load your workspace.</h1><p>Your saved work is safe. Try again, or sign in to reconnect.</p><button onClick={reset}>Try again</button><Link href="/login">Return to sign in</Link></main>;
}
