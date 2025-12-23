'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import PageWrapper from '@/components/ui/PageWrapper';
import FormInput from '@/components/ui/FormInput';
import { Loader } from '@/components/ui/Loader';

export default function SetPasswordPage() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const sessionToken = sessionStorage.getItem('supabase_access_token');
    console.log('🔑 Session token:', sessionToken);

    if (!sessionToken) {
      console.warn('⚠️ No token found, redirecting to login');
      router.replace('/public/auth/login');
      return;
    }

    setToken(sessionToken);
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

    if (!token) {
      setError('Invalid session, please retry');
      return;
    }

    setLoading(true);

    try {
      console.log('🚀 Resetting password for token:', token);

      // Use Supabase auth API to update password via invite token
      const { error: updateError } = await supabase.auth.updateUser({
        access_token: token,
        password: newPassword,
      });

      if (updateError) {
        console.error('❌ Password update error:', updateError);
        setError(updateError.message);
        setLoading(false);
        return;
      }

      console.log('✅ Password updated successfully');

      // Clear token from session storage
      sessionStorage.removeItem('supabase_access_token');

      alert('Password set successfully! Please login now.');
      router.replace('/public/auth/login');
    } catch (err: any) {
      console.error('🔥 Unexpected error:', err);
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!token) return <Loader message="Validating session..." />;

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
