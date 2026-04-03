import Image from "next/image";

import { ThemeToggle } from "@/components/theme-toggle";

export const EnvironmentSetupView = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-12%] left-[-6%] h-80 w-80 rounded-full bg-vscode-blue/15 blur-3xl animate-glow" />
        <div className="absolute right-[-8%] bottom-[-16%] h-96 w-96 rounded-full bg-cyan-400/12 blur-3xl animate-float" />
      </div>
      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-6 md:px-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3 rounded-full border border-panel-border bg-panel-elevated px-4 py-2 backdrop-blur-xl">
            <Image alt="Torq-AI" height={40} src="/logo.svg" width={40} />
            <div>
              <p className="text-sm font-semibold tracking-[0.2em] text-vscode-blue uppercase">
                Torq-AI
              </p>
              <p className="text-xs text-muted-foreground">
                Workspace configuration required
              </p>
            </div>
          </div>
          <ThemeToggle />
        </header>
        <main className="flex flex-1 items-center justify-center py-12">
          <div className="max-w-2xl rounded-[2rem] border border-panel-border bg-panel p-8 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl md:p-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-vscode-blue/20 bg-vscode-blue/10 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-vscode-blue uppercase">
              Almost ready
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] md:text-5xl">
              Clerk is wired up. Convex still needs to be connected.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground md:text-base">
              I added the Clerk values you shared, but Torq-AI still needs your
              Convex deployment details before the authenticated workspace can
              boot fully.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-panel-border bg-panel-elevated p-5">
                <p className="text-xs font-semibold tracking-[0.18em] text-vscode-green uppercase">
                  Ready
                </p>
                <p className="mt-2 text-sm font-medium">Clerk publishable key</p>
                <p className="text-sm font-medium">Clerk secret key</p>
                <p className="text-sm font-medium">Clerk issuer domain</p>
              </div>
              <div className="rounded-2xl border border-panel-border bg-panel-elevated p-5">
                <p className="text-xs font-semibold tracking-[0.18em] text-vscode-orange uppercase">
                  Still needed
                </p>
                <p className="mt-2 text-sm font-medium">`NEXT_PUBLIC_CONVEX_URL`</p>
                <p className="text-sm font-medium">`CONVEX_DEPLOYMENT`</p>
                <p className="text-sm font-medium">`TORQ_AI_CONVEX_INTERNAL_KEY`</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
