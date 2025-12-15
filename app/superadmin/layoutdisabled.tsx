import { ReactNode } from 'react';
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies as nextCookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function SuperadminLayout({ children }: { children: ReactNode }) {
  // get cookie store (no parentheses if using App Router)
  const cookieStore = nextCookies(); // returns ReadonlyRequestCookies

  const cookies = {
    get: (name: string) => {
      // Use optional chaining safely
      const cookie = cookieStore.get?.(name);
      return cookie?.value ?? null;
    },
    set: (_name: string, _value: string, _options?: any) => {
      throw new Error('Cannot set cookies in App Router layout');
    },
    remove: (_name: string, _options?: any) => {
      throw new Error('Cannot remove cookies in App Router layout');
    },
  };

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  // Optional: check role
  const { data: userInfo } = await supabase
    .from('users')
    .select('role_id')
    .eq('auth_uid', user.id)
    .maybeSingle();

  if (!userInfo || userInfo.role_id !== 1) redirect('/auth/login');

  return <>{children}</>;
}
