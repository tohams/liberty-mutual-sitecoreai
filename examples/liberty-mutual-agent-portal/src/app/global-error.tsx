'use client';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return <html lang="en"><body style={{ margin: 0, padding: '8vh 8vw', fontFamily: 'Arial, sans-serif', color: '#1a1446', background: '#f7f7f5' }}><main>
    <p style={{ fontSize: 20, fontWeight: 700 }}>Liberty Mutual · Agent Portal</p>
    <h1>We couldn’t open your workspace.</h1>
    <p>Please try again in a moment. Your previously saved work remains available.</p>
    <button onClick={reset} style={{ padding: '12px 24px', background: '#ffd000', border: 0, borderRadius: 4, fontWeight: 700 }}>Try again</button>
  </main></body></html>;
}
