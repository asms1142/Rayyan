"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import RouteProgress from "@/components/layout/RouteProgress";

interface Props {
  children: React.ReactNode;
}

export default function RouteProgressWrapper({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleNavigationStart = () => {
      RouteProgress.start();
    };

    const handleNavigationComplete = () => {
      RouteProgress.finish();
    };

    const handleRouteChange = () => {
      handleNavigationStart();
      setTimeout(handleNavigationComplete, 300);
    };

    // Listen for browser history changes
    window.addEventListener("popstate", handleRouteChange);
    window.addEventListener("pushstate", handleRouteChange);

    return () => {
      window.removeEventListener("popstate", handleRouteChange);
      window.removeEventListener("pushstate", handleRouteChange);
    };
  }, [pathname]);

  return <>{children}</>;
}
