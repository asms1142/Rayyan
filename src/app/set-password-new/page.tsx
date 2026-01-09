'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import PageWrapper from '@/components/ui/PageWrapper';
import FormInput from '@/components/ui/FormInput';
import { Loader } from '@/components/ui/Loader';

export default function SetPasswordPage() {
  const router = useRouter();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 1️⃣ Get tokens from sessionStorage
  useEffect(() => {
    const access = sessionStorage.getItem('supabase_access_token');
    const refresh = sessionStorage.getItem('supabase_refresh_token');

    if (!access || !refresh) {
      router.replace('/public/auth/login');
      return;
    }

    setAccessToken(access);
    setRefreshToken(refresh);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Please fill in both fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!accessToken || !refreshToken) {
      setError('Invalid session, please retry');
      return;
    }

    setLoading(true);

    try {
      // 2️⃣ Set the Supabase session temporarily
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) throw sessionError;

      // 3️⃣ Update the password for the current user
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      // Clear tokens from sessionStorage
      sessionStorage.removeItem('supabase_access_token');
      sessionStorage.removeItem('supabase_refresh_token');

      alert('Password set successfully! Please login now.');
      router.replace('/public/auth/login');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!accessToken || !refreshToken)
    return <Loader message="Validating session..." />;

  return (
    <PageWrapper title="Set New Password" breadcrumb={[{ label: 'Set Password' }]}>
      <div className="max-w-md mx-auto p-6 bg-white shadow-md rounded-md">
        <h2 className="text-xl font-semibold mb-4 text-center">Set Your New Password</h2>

        {error && (
          <div className="mb-4 text-red-500 font-medium text-center">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="New Password"
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            required
          />
          <FormInput
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition"
          >
            {loading ? 'Setting Password...' : 'Set Password'}
          </button>
        </form>
      </div>
    </PageWrapper>
  );
}
