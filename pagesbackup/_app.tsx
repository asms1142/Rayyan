import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import AppLayout from "@/components/layout/AppLayout";

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  const noLayoutRoutes = ["/auth/login", "/org-login"];

  if (noLayoutRoutes.includes(router.pathname)) {
    return <Component {...pageProps} />;
  }

  return (
    <AppLayout>
      <Component {...pageProps} />
    </AppLayout>
  );
}
