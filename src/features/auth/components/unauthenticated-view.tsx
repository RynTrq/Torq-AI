"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignInButton, useAuth, useClerk } from "@clerk/nextjs";
import {
  ArrowRightIcon,
  Loader2Icon,
  RefreshCwIcon,
  ShieldCheckIcon,
  ShieldXIcon,
  SparkleIcon,
  TerminalSquareIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export const UnauthenticatedView = () => {
  const router = useRouter();
  const { signOut } = useClerk();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const handleRefreshConvexSession = async () => {
    setIsRefreshing(true);
    setTokenError(null);

    try {
      let token: string | null = null;

      try {
        token = await getToken({
          skipCache: true,
        });
      } catch {
        token = null;
      }

      if (!token) {
        token = await getToken({
          template: "convex",
          skipCache: true,
        });
      }

      if (!token) {
        setTokenError(
          "Clerk is signed in, but no Convex token is available yet. Since your Clerk session already has the managed Convex claim, sign out, sign back in, and retry. If it still fails, create a JWT template named 'convex' in Clerk Dashboard as a compatibility fallback."
        );
        return;
      }

      router.refresh();
      window.location.reload();
    } catch {
      setTokenError(
        "Torq-AI could not fetch a Clerk token that Convex accepts. Sign out and sign back in first. If the problem persists, open Clerk Dashboard -> JWT Templates and create a template named 'convex' as a fallback."
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    await signOut({
      redirectUrl: "/",
    });
  };

  const showConvexMismatchState = isLoaded && isSignedIn;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-14%] left-[-8%] h-96 w-96 rounded-full bg-vscode-blue/18 blur-3xl animate-glow" />
        <div className="absolute right-[-10%] bottom-[-18%] h-[28rem] w-[28rem] rounded-full bg-cyan-400/15 blur-3xl animate-float" />
      </div>
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-6 md:px-10">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 rounded-full border border-panel-border bg-panel-elevated px-4 py-2 backdrop-blur-xl">
            <Image alt="Torq-AI" height={40} src="/logo.svg" width={40} />
            <div>
              <p className="text-[11px] font-semibold tracking-[0.3em] text-vscode-blue uppercase">
                Torq-AI
              </p>
              <p className="text-sm font-medium">AI-native code workspace</p>
            </div>
          </div>
          <ThemeToggle />
        </header>
        <main className="flex flex-1 items-center justify-center py-10">
          <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="rounded-[2rem] border border-panel-border bg-panel p-8 shadow-[0_28px_100px_rgba(15,23,42,0.2)] backdrop-blur-xl md:p-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-vscode-blue/20 bg-vscode-blue/10 px-3 py-1 text-xs font-semibold tracking-[0.22em] text-vscode-blue uppercase">
                <SparkleIcon className="size-3.5" />
                Welcome
              </div>
              <h1 className="mt-6 text-4xl font-semibold tracking-[-0.05em] md:text-6xl">
                Sign in to launch the Torq-AI cockpit.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
                Jump back into your projects, import repositories, iterate with
                AI, and preview your app from the same workspace.
              </p>
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.4rem] border border-panel-border bg-panel-elevated p-5">
                  <TerminalSquareIcon className="size-4 text-vscode-green" />
                  <p className="mt-4 text-lg font-semibold">Code + preview</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Keep the editor, browser preview, and terminal in sync while
                    you build.
                  </p>
                </div>
                <div className="rounded-[1.4rem] border border-panel-border bg-panel-elevated p-5">
                  {showConvexMismatchState ? (
                    <ShieldXIcon className="size-4 text-vscode-orange" />
                  ) : (
                    <ShieldCheckIcon className="size-4 text-vscode-blue" />
                  )}
                  <p className="mt-4 text-lg font-semibold">
                    {showConvexMismatchState ? "Session needs sync" : "Clerk-secured"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {showConvexMismatchState
                      ? "Clerk has a signed-in session, but Convex has not accepted the auth token yet."
                      : "Authentication is already wired in, so you can focus on building instead of boilerplate."}
                  </p>
                </div>
              </div>
            </section>

            <section className="flex items-center">
              <div className="w-full rounded-[2rem] border border-panel-border bg-panel p-8 shadow-[0_24px_80px_rgba(15,23,42,0.16)] backdrop-blur-xl md:p-10">
                <p className="text-xs font-semibold tracking-[0.22em] text-vscode-orange uppercase">
                  Access
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
                  {showConvexMismatchState
                    ? "Clerk is signed in. Convex still needs the token."
                    : "One sign-in and you’re in."}
                </h2>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {showConvexMismatchState
                    ? "This usually means the Clerk token template named 'convex' is missing or the session needs a clean refresh."
                    : "Use your account to open the Torq-AI workspace and continue building with the full editor experience."}
                </p>
                {showConvexMismatchState ? (
                  <>
                    <Button
                      className="mt-8 h-12 w-full rounded-2xl bg-gradient-to-r from-vscode-blue via-cyan-500 to-vscode-purple text-white shadow-[0_20px_50px_rgba(0,122,204,0.35)] hover:brightness-110"
                      disabled={isRefreshing}
                      onClick={handleRefreshConvexSession}
                    >
                      {isRefreshing ? (
                        <>
                          <Loader2Icon className="size-4 animate-spin" />
                          Refreshing Convex session...
                        </>
                      ) : (
                        <>
                          Refresh Convex session
                          <RefreshCwIcon className="size-4" />
                        </>
                      )}
                    </Button>
                    <Button
                      className="mt-3 h-11 w-full rounded-2xl"
                      onClick={handleSignOut}
                      variant="outline"
                    >
                      Sign out and try again
                    </Button>
                    {tokenError ? (
                      <div className="mt-4 rounded-2xl border border-vscode-orange/20 bg-vscode-orange/8 p-4 text-sm leading-6 text-muted-foreground">
                        {tokenError}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-panel-border bg-panel-elevated p-4 text-sm leading-6 text-muted-foreground">
                        If refresh does not work, sign out and back in once so
                        Clerk can mint a fresh session token. If it still fails,
                        add a JWT template named <code>convex</code> in Clerk as
                        a compatibility fallback.
                      </div>
                    )}
                  </>
                ) : (
                  <SignInButton
                    fallbackRedirectUrl="/"
                    forceRedirectUrl="/"
                    mode="modal"
                    signUpFallbackRedirectUrl="/"
                    signUpForceRedirectUrl="/"
                    withSignUp
                  >
                    <Button className="mt-8 h-12 w-full rounded-2xl bg-gradient-to-r from-vscode-blue via-cyan-500 to-vscode-purple text-white shadow-[0_20px_50px_rgba(0,122,204,0.35)] hover:brightness-110">
                      Sign in to Torq-AI
                      <ArrowRightIcon className="size-4" />
                    </Button>
                  </SignInButton>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};
