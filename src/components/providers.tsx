"use client";

import { useCallback, useMemo } from "react";
import { 
  Authenticated, 
  Unauthenticated,
  ConvexReactClient,
  AuthLoading, 
  ConvexProviderWithAuth,
} from "convex/react";
import { ClerkProvider, useAuth } from "@clerk/nextjs";

import { UnauthenticatedView } from "@/features/auth/components/unauthenticated-view";
import { AuthLoadingView } from "@/features/auth/components/auth-loading-view";

import { EnvironmentSetupView } from "./environment-setup-view";
import { ThemeProvider } from "./theme-provider";

const useConvexClerkAuth = () => {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      try {
        const sessionToken = await getToken({
          skipCache: forceRefreshToken,
        });

        if (sessionToken) {
          return sessionToken;
        }
      } catch {
        // Fall through to the legacy Convex JWT template lookup below.
      }

      try {
        return await getToken({
          template: "convex",
          skipCache: forceRefreshToken,
        });
      } catch {
        return null;
      }
    },
    [getToken],
  );

  return useMemo(
    () => ({
      isLoading: !isLoaded,
      isAuthenticated: isSignedIn ?? false,
      fetchAccessToken,
    }),
    [fetchAccessToken, isLoaded, isSignedIn],
  );
};

export const Providers = ({ children }: { children: React.ReactNode }) => {
  const clerkPublishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const convex = useMemo(() => {
    if (!convexUrl) {
      return null;
    }

    return new ConvexReactClient(convexUrl);
  }, [convexUrl]);

  if (!clerkPublishableKey) {
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <EnvironmentSetupView missingClerk missingConvex={!convex} />
      </ThemeProvider>
    );
  }

  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      afterSignOutUrl="/"
      appearance={{
        variables: {
          colorPrimary: "#007acc",
          borderRadius: "0.95rem",
        },
      }}
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
    >
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        {convex ? (
          <ConvexProviderWithAuth client={convex} useAuth={useConvexClerkAuth}>
            <Authenticated>
              {children}
            </Authenticated>
            <Unauthenticated>
              <UnauthenticatedView />
            </Unauthenticated>
            <AuthLoading>
              <AuthLoadingView />
            </AuthLoading>
          </ConvexProviderWithAuth>
        ) : (
          <EnvironmentSetupView missingClerk={false} missingConvex />
        )}
      </ThemeProvider>
    </ClerkProvider>
  );
};
