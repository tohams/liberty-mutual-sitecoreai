import { redirect } from 'next/navigation';
import { getSession } from '@/server/auth/session';
import { getPortalBootstrap } from '@/server/data/portal';
import { PortalError } from '@/server/errors';
import { LoginScreen } from '@/features/auth/LoginScreen';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign in' };

export default async function LoginPage() {
  const session = await getSession();
  let hasActiveWorkspace = false;
  if (session) {
    try {
      await getPortalBootstrap(session);
      hasActiveWorkspace = true;
    } catch (error) {
      // A reset or expired workspace may leave a valid signed cookie. Allow a fresh login.
      if (!(error instanceof PortalError) || ![401, 409].includes(error.status)) throw error;
    }
  }
  if (hasActiveWorkspace) redirect('/workspace');
  return <LoginScreen />;
}
