"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider, useSession } from "next-auth/react";

import { AuthLoadingView } from "@/features/auth/components/auth-loading-view";
import { ThemeProvider } from "./theme-provider";

const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const { status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated" && pathname !== "/auth") {
      router.replace("/auth");
      return;
    }

    if (status === "authenticated" && pathname === "/auth") {
      router.replace("/");
    }
  }, [pathname, router, status]);

  if (status === "loading") {
    return <AuthLoadingView />;
  }

  if (pathname === "/auth") {
    return status === "authenticated" ? <AuthLoadingView /> : <>{children}</>;
  }

  if (status === "unauthenticated") {
    return <AuthLoadingView />;
  }

  return <>{children}</>;
};

export const Providers = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthGate>{children}</AuthGate>
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
};
