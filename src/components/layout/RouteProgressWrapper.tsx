"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import NProgress from "nprogress";
import "nprogress/nprogress.css";

interface Props {
  children: React.ReactNode;
}

// Global NProgress config (do this once)
NProgress.configure({
  showSpinner: false,
  speed: 400,
  minimum: 0.1,
});

export default function RouteProgressWrapper({ children }: Props) {
  const pathname = usePathname();

  useEffect(() => {
    // Start progress bar on route change
    NProgress.start();

    // Ensure progress bar always completes
    const timer = setTimeout(() => {
      NProgress.done();
    }, 300);

    return () => {
      clearTimeout(timer);
      NProgress.done(true);
    };
  }, [pathname]);

  return <>{children}</>;
}
