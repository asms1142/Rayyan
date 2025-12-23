'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      console.log('🔁 Auth callback page loaded');
      console.log('🔗 URL:', window.location.href);

      const hash = window.location.hash;
      console.log('🔑 Hash:', hash);

      if (!hash) {
        console.error('❌ No auth hash found');
        return;
      }

      const params = new URLSearchParams(hash.substring(1));
      const type = params.get('type');

      console.log('📦 Auth type:', type);

      // Set session explicitly (important!)
      const { error } = await supabase.auth.getSession();
      if (error) {
        console.error('❌ Session error:', error.message);
      }

      if (type === 'invite') {
        console.log('➡️ Redirecting to set-password-new');
        router.replace('/set-password-new');
        return;
      }

      // fallback
      router.replace('/auth/login');
    };

    handleAuth();
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-gray-600">Processing authentication…</p>
    </div>
  );
}
