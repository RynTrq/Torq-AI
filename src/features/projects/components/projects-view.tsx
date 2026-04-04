"use client";

import Image from "next/image";
import { FaGithub } from "react-icons/fa";
import { useEffect, useState } from "react";
import {
  ArrowRightIcon,
  CommandIcon,
  GitBranchPlusIcon,
  SparkleIcon,
  TerminalSquareIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { ThemeToggle } from "@/components/theme-toggle";
import { ModelToggle } from "@/features/ai/components/model-toggle";
import { UserMenu } from "@/features/auth/components/user-menu";

import { ProjectsList } from "./projects-list";
import { ProjectsCommandDialog } from "./projects-command-dialog";
import { ImportGithubDialog } from "./import-github-dialog";
import { NewProjectDialog } from "./new-project-dialog";

export const ProjectsView = () => {
  const [commandDialogOpen, setCommandDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === "k") {
          e.preventDefault();
          setCommandDialogOpen(true);
        }
        if (e.key === "i") {
          e.preventDefault();
          setImportDialogOpen(true);
        }
        if (e.key === "j") {
          e.preventDefault();
          setNewProjectDialogOpen(true);
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);


  return (
    <>
      <ProjectsCommandDialog
        open={commandDialogOpen}
        onOpenChange={setCommandDialogOpen}
      />
      <ImportGithubDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />
      <NewProjectDialog
        open={newProjectDialogOpen}
        onOpenChange={setNewProjectDialogOpen}
      />
      <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-[-14%] left-[-10%] h-96 w-96 rounded-full bg-vscode-blue/18 blur-3xl animate-glow" />
          <div className="absolute top-[18%] right-[-8%] h-[28rem] w-[28rem] rounded-full bg-cyan-400/15 blur-3xl animate-float" />
          <div className="absolute bottom-[-18%] left-[18%] h-80 w-80 rounded-full bg-vscode-purple/15 blur-3xl animate-glow" />
        </div>
        <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-6 md:px-10 md:py-8">
          <header className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 rounded-full border border-panel-border bg-panel-elevated px-4 py-2 shadow-[0_12px_40px_rgba(15,23,42,0.14)] backdrop-blur-xl">
              <Image
                alt="Torq-AI"
                className="size-10"
                height={40}
                src="/logo.svg"
                width={40}
              />
              <div>
                <p className="text-[11px] font-semibold tracking-[0.3em] text-vscode-blue uppercase">
                  Torq-AI
                </p>
                <p className="text-sm font-medium text-foreground">
                  AI-native build cockpit
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ModelToggle />
              <ThemeToggle />
              <div className="rounded-full border border-panel-border bg-panel-elevated p-1 shadow-[0_12px_32px_rgba(15,23,42,0.14)] backdrop-blur-xl">
                <UserMenu />
              </div>
            </div>
          </header>

          <main className="flex flex-1 items-center py-10 md:py-14">
            <div className="grid w-full gap-8 xl:grid-cols-[1.2fr_0.8fr]">
              <section className="rounded-[2rem] border border-panel-border bg-panel p-8 shadow-[0_28px_100px_rgba(15,23,42,0.2)] backdrop-blur-xl md:p-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-vscode-blue/20 bg-vscode-blue/10 px-3 py-1 text-xs font-semibold tracking-[0.24em] text-vscode-blue uppercase">
                  <SparkleIcon className="size-3.5" />
                  Studio Mode
                </div>
                <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.05em] md:text-6xl">
                  Build fast. Ship clean. Let Torq-AI handle the heavy lift.
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                  Spin up new products, import existing repositories, and move
                  through code, chat, preview, and GitHub export without leaving
                  the cockpit.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <span className="rounded-full border border-panel-border bg-panel-elevated px-3 py-1.5 text-sm text-muted-foreground">
                    Multi-file editing
                  </span>
                  <span className="rounded-full border border-panel-border bg-panel-elevated px-3 py-1.5 text-sm text-muted-foreground">
                    Live preview + terminal
                  </span>
                  <span className="rounded-full border border-panel-border bg-panel-elevated px-3 py-1.5 text-sm text-muted-foreground">
                    GitHub import and export
                  </span>
                </div>

                <div className="mt-10 grid gap-4 md:grid-cols-2">
                  <Button
                    className="group h-auto whitespace-normal items-start justify-start rounded-[1.6rem] border-0 bg-gradient-to-br from-vscode-blue via-cyan-500 to-vscode-purple px-6 py-6 text-left text-white shadow-[0_22px_60px_rgba(0,122,204,0.34)] hover:brightness-110"
                    onClick={() => setNewProjectDialogOpen(true)}
                  >
                    <div className="flex min-w-0 w-full flex-col gap-10">
                      <div className="flex items-center justify-between">
                        <div className="rounded-full bg-white/14 p-2">
                          <SparkleIcon className="size-4" />
                        </div>
                        <Kbd className="border-white/15 bg-white/10 text-white">
                          ⌘J
                        </Kbd>
                      </div>
                      <div className="min-w-0 space-y-3">
                        <p className="break-words text-2xl font-semibold tracking-[-0.03em]">
                          Start a new project
                        </p>
                        <p className="break-words text-sm leading-6 text-white/75">
                          Describe the product once. Torq-AI scaffolds the first
                          cut and gets you into the editor fast.
                        </p>
                        <div className="flex items-center gap-2 text-sm font-medium">
                          Create workspace
                          <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    </div>
                  </Button>

                  <Button
                    className="group h-auto whitespace-normal items-start justify-start rounded-[1.6rem] border border-panel-border bg-panel-elevated px-6 py-6 text-left text-foreground shadow-[0_18px_50px_rgba(15,23,42,0.12)] hover:border-vscode-blue/30 hover:bg-panel"
                    onClick={() => setImportDialogOpen(true)}
                    variant="outline"
                  >
                    <div className="flex min-w-0 w-full flex-col gap-10">
                      <div className="flex items-center justify-between">
                        <div className="rounded-full bg-vscode-blue/10 p-2 text-vscode-blue">
                          <FaGithub className="size-4" />
                        </div>
                        <Kbd className="border-panel-border bg-panel text-foreground">
                          ⌘I
                        </Kbd>
                      </div>
                      <div className="min-w-0 space-y-3">
                        <p className="break-words text-2xl font-semibold tracking-[-0.03em]">
                          Import a repository
                        </p>
                        <p className="break-words text-sm leading-6 text-muted-foreground">
                          Pull an existing GitHub codebase into the Torq-AI
                          workspace and keep building from there.
                        </p>
                        <div className="flex items-center gap-2 text-sm font-medium text-vscode-blue">
                          Bring code in
                          <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    </div>
                  </Button>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  <div className="rounded-[1.4rem] border border-panel-border bg-panel-elevated p-5">
                    <CommandIcon className="size-4 text-vscode-blue" />
                    <p className="mt-4 text-lg font-semibold">Command deck</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Search projects fast, keep momentum, and jump straight into
                      the last thing you were building.
                    </p>
                  </div>
                  <div className="rounded-[1.4rem] border border-panel-border bg-panel-elevated p-5">
                    <TerminalSquareIcon className="size-4 text-vscode-green" />
                    <p className="mt-4 text-lg font-semibold">Preview stack</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Code, preview, and inspect runtime output in a single flow
                      without bouncing between tools.
                    </p>
                  </div>
                  <div className="rounded-[1.4rem] border border-panel-border bg-panel-elevated p-5">
                    <GitBranchPlusIcon className="size-4 text-vscode-orange" />
                    <p className="mt-4 text-lg font-semibold">GitHub ready</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Import a repo, refine it with AI, and push a polished
                      export back out when you are ready.
                    </p>
                  </div>
                </div>
              </section>

              <aside className="space-y-6">
                <div className="rounded-[2rem] border border-panel-border bg-panel p-6 shadow-[0_20px_70px_rgba(15,23,42,0.16)] backdrop-blur-xl">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold tracking-[0.2em] text-vscode-blue uppercase">
                        Workspaces
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                        Pick up where you left off
                      </h2>
                    </div>
                    <button
                      className="flex items-center gap-2 rounded-full border border-panel-border bg-panel-elevated px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                      onClick={() => setCommandDialogOpen(true)}
                      type="button"
                    >
                      View all
                      <Kbd className="border-panel-border bg-panel text-foreground">
                        ⌘K
                      </Kbd>
                    </button>
                  </div>
                  <div className="mt-6">
                    <ProjectsList onViewAll={() => setCommandDialogOpen(true)} />
                  </div>
                </div>

                <div className="rounded-[2rem] border border-panel-border bg-panel p-6 shadow-[0_20px_60px_rgba(15,23,42,0.14)] backdrop-blur-xl">
                  <p className="text-xs font-semibold tracking-[0.2em] text-vscode-orange uppercase">
                    Keyboard flow
                  </p>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between rounded-2xl border border-panel-border bg-panel-elevated px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        Command palette
                      </span>
                      <Kbd className="border-panel-border bg-panel text-foreground">
                        ⌘K
                      </Kbd>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-panel-border bg-panel-elevated px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        New AI project
                      </span>
                      <Kbd className="border-panel-border bg-panel text-foreground">
                        ⌘J
                      </Kbd>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-panel-border bg-panel-elevated px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        Import from GitHub
                      </span>
                      <Kbd className="border-panel-border bg-panel text-foreground">
                        ⌘I
                      </Kbd>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </main>
        </div>
      </div>
    </>
  );
};
