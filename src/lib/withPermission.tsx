'use client';

import { useAuth } from './AuthProvider';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';

interface Props {
  children: ReactNode;
  menuId: string | number; // corresponds to menu_id in menu_access
}

export default function WithPermission({ children, menuId }: Props) {
  const { user, permissions, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/org-login');
    }
  }, [user, loading, router]);

  if (loading) return <p>Loading...</p>;
  if (!user) return null;

  const menuPerm = permissions[menuId];
  if (!menuPerm || !menuPerm.view) {
    router.push('/unauthorized');
    return null;
  }

  return <>{children}</>;
}
