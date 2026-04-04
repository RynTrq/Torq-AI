"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { getProviders, signIn } from "next-auth/react";
import {
  ArrowRightIcon,
  GithubIcon,
  Loader2Icon,
  LockKeyholeIcon,
  SparkleIcon,
  TerminalSquareIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";

export const UnauthenticatedView = () => {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [githubEnabled, setGithubEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;

    void getProviders().then((providers) => {
      if (!mounted) {
        return;
      }

      setGithubEnabled(Boolean(providers?.github));
    });

    return () => {
      mounted = false;
    };
  }, []);

  const submitLabel = useMemo(() => {
    if (isSubmitting) {
      return mode === "signin" ? "Signing in..." : "Creating account...";
    }

    return mode === "signin" ? "Sign in to Torq-AI" : "Create Torq-AI account";
  }, [isSubmitting, mode]);

  const handleCredentialsSubmit = async () => {
    setIsSubmitting(true);
    setAuthError(null);

    try {
      if (mode === "signup") {
        const registerResponse = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim() || undefined,
            email,
            password,
          }),
        });

        const registerBody = (await registerResponse.json()) as {
          error?: string;
          code?: string;
        };

        if (!registerResponse.ok) {
          if (
            registerResponse.status === 409 ||
            registerBody.code === "ACCOUNT_EXISTS"
          ) {
            setMode("signin");
            setAuthError(
              registerBody.error ||
                "That email already has an account. Sign in instead, or use a different email.",
            );
            return;
          }

          setAuthError(registerBody.error || "Unable to create account");
          return;
        }
      }

      const response = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/",
      });

      if (response?.error) {
        setAuthError(
          mode === "signin"
            ? "Email or password is incorrect."
            : "Account created, but sign-in failed. Please try again.",
        );
        return;
      }

      const destination =
        response?.url && response.url.startsWith("/")
          ? response.url
          : "/";

      window.location.assign(destination);
    } catch {
      setAuthError("Unable to continue right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGithubSignIn = async () => {
    setAuthError(null);
    await signIn("github", {
      callbackUrl: "/",
    });
  };

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
                  <LockKeyholeIcon className="size-4 text-vscode-blue" />
                  <p className="mt-4 text-lg font-semibold">Session-backed access</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Sign in with email and password or connect GitHub to carry
                    your workspace session cleanly across deploy environments.
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
                  {mode === "signin"
                    ? "Sign in and keep building."
                    : "Create your Torq-AI account."}
                </h2>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  Use credentials for a direct workspace login, or jump through
                  GitHub when you want repo access and account linking in the
                  same flow.
                </p>
                <div className="mt-8 space-y-4">
                  <div className="grid gap-3">
                    {mode === "signup" ? (
                      <Input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Your name"
                      />
                    ) : null}
                    <Input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@torq-ai.com"
                    />
                    <Input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Password"
                    />
                  </div>
                  <Button
                    className="h-12 w-full rounded-2xl bg-gradient-to-r from-vscode-blue via-cyan-500 to-vscode-purple text-white shadow-[0_20px_50px_rgba(0,122,204,0.35)] hover:brightness-110"
                    disabled={!email.trim() || !password.trim() || isSubmitting}
                    onClick={() => void handleCredentialsSubmit()}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2Icon className="size-4 animate-spin" />
                        {submitLabel}
                      </>
                    ) : (
                      <>
                        {submitLabel}
                        <ArrowRightIcon className="size-4" />
                      </>
                    )}
                  </Button>
                  {githubEnabled ? (
                    <Button
                      className="h-11 w-full rounded-2xl"
                      onClick={() => void handleGithubSignIn()}
                      type="button"
                      variant="outline"
                    >
                      <GithubIcon className="size-4" />
                      Continue with GitHub
                    </Button>
                  ) : null}
                  {authError ? (
                    <div className="rounded-2xl border border-vscode-orange/20 bg-vscode-orange/8 p-4 text-sm leading-6 text-muted-foreground">
                      {authError}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-panel-border bg-panel-elevated p-4 text-sm leading-6 text-muted-foreground">
                      {mode === "signin"
                        ? "Need a new workspace account? Create one here, then keep iterating from the same cockpit."
                        : "Already have an account? Flip back to sign in and continue right where you left off."}
                    </div>
                  )}
                  <Button
                    className="w-full rounded-2xl"
                    onClick={() => {
                      setAuthError(null);
                      setMode((current) =>
                        current === "signin" ? "signup" : "signin",
                      );
                    }}
                    type="button"
                    variant="ghost"
                  >
                    {mode === "signin"
                      ? "Need an account? Create one"
                      : "Already have an account? Sign in"}
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};
