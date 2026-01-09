'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthRedirect = async () => {
      try {
        console.log('🏠 Root page loaded');
        console.log('🔗 Current URL:', window.location.href);

        const hash = window.location.hash;
        if (!hash) {
          console.log('➡️ No auth hash found, redirecting to login');
          router.replace('/auth/login');
          return;
        }

        // Parse hash fragment
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        const type = params.get('type');

        console.log('🔑 Hash params:', { accessToken, type });

        if (!accessToken) {
          console.error('❌ No access token found in hash, redirecting to login');
          router.replace('/auth/login');
          return;
        }

        // Temporarily store token in session storage for the user
        sessionStorage.setItem('supabase_access_token', accessToken);

        // Clear hash from URL for security
        window.history.replaceState(null, '', window.location.pathname);

        // IMPORTANT: update Supabase client with temporary access token
        await supabase.auth.exchangeCodeForSession(accessToken);

        // Redirect based on type
        if (type === 'invite') {
          console.log('✅ Invite detected → redirecting to set-password-new');
          router.replace('/set-password-new');
          return;
        }

        console.log('➡️ Default redirect to dashboard');
        router.replace('/protected/dashboard');
      } catch (err: any) {
        console.error('🔥 Error handling auth redirect:', err);
        // fallback
        router.replace('/auth/login');
      }
    };

    handleAuthRedirect();
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen text-gray-600">
      Processing authentication…
    </div>
  );
}
