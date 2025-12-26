'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Loader } from '@/components/ui/Loader';
import FormInput from '@/components/ui/FormInput';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      // 1️⃣ Authenticate user with Supabase
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;
      if (!loginData.session?.user) throw new Error('Login failed');

      const authUid = loginData.session.user.id;

      // 2️⃣ Fetch userinfo for preferred landing page and role
      const { data: userInfo, error: userInfoError } = await supabase
        .from('userinfo')
        .select('prefered_land_page, role_id')
        .eq('auth_uid', authUid)
        .single();

      if (userInfoError) throw userInfoError;

      let targetPage = userInfo?.prefered_land_page?.trim() || '';

      // 3️⃣ Validate page against allowed pages
      const allowedPages = ['/dashboard', '/customers', '/customers/create', '/module-menu'];
      const isValidPage = (page?: string) => page && allowedPages.includes(page);

      // 4️⃣ If prefered page invalid, check role default landing page
      if (!isValidPage(targetPage)) {
        if (userInfo?.role_id) {
          const { data: roleData, error: roleError } = await supabase
            .from('userrole')
            .select('default_land_page')
            .eq('role_id', userInfo.role_id)
            .single();

          if (!roleError && roleData?.default_land_page) {
            targetPage = roleData.default_land_page.trim();
          } else {
            targetPage = '';
          }
        } else {
          targetPage = '';
        }
      }

      // 5️⃣ Final redirect
      if (isValidPage(targetPage)) {
        router.push(targetPage);
      } else {
        router.push('/unauthorized');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white p-6 rounded shadow">
        <h1 className="text-2xl font-bold mb-4 text-center">Login</h1>

        {error && <div className="text-red-500 mb-4">{error}</div>}

        <FormInput
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3"
        />
        <FormInput
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-3"
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          {loading ? <Loader message="Logging in..." /> : 'Login'}
        </button>
      </div>
    </div>
  );
}
