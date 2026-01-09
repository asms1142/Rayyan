"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import NProgress from "nprogress";
import "nprogress/nprogress.css";

interface Props {
  children: React.ReactNode;
}

export default function RouteProgressWrapper({ children }: Props) {
  const pathname = usePathname();

  useEffect(() => {
    // Start loading bar on route change
    NProgress.start();

    // Stop loading bar after route render
    return () => {
      NProgress.done();
    };
  }, [pathname]);

  return <>{children}</>;
}
