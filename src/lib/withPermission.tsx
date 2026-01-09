'use client';

import { useAuth } from './AuthProvider';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';

interface Props {
  children: ReactNode;
  menuId: string | number; // corresponds to menu_id in menu_access
}

// Optional: define the structure of permissions
interface MenuPermission {
  view?: boolean;
  edit?: boolean;
  delete?: boolean;
}

export default function WithPermission({ children, menuId }: Props) {
  // Ensure permissions exists in useAuth
  const { user, permissions = {}, loading } = useAuth() as {
    user: any;
    permissions?: Record<string | number, MenuPermission>;
    loading: boolean;
  };
  const router = useRouter();

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/org-login');
    }
  }, [user, loading, router]);

  if (loading) return <p>Loading...</p>;
  if (!user) return null;

  // Check menu permissions safely
  const menuPerm: MenuPermission = permissions?.[menuId] ?? {};
  if (!menuPerm.view) {
    router.push('/unauthorized');
    return null;
  }

  return <>{children}</>;
}
