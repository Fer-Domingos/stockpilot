'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Loader2 } from 'lucide-react';

function MagicCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionToken = searchParams.get('session');

  useEffect(() => {
    const handleMagicLogin = async () => {
      if (!sessionToken) {
        router.push('/login?error=InvalidSession');
        return;
      }

      // Sign in using the magic token credential
      const result = await signIn('magic-link', {
        token: sessionToken,
        redirect: false
      });

      if (result?.error) {
        router.push('/login?error=AuthFailed');
      } else {
        router.push('/dashboard');
      }
    };

    handleMagicLogin();
  }, [sessionToken, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="text-center">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
        <p className="mt-4 text-gray-600">Signing you in...</p>
      </div>
    </div>
  );
}

export default function MagicCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    }>
      <MagicCallbackContent />
    </Suspense>
  );
}
