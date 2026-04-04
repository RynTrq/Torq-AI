"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { AlertTriangleIcon, CloudCheckIcon, LoaderIcon, Trash2Icon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme-toggle";
import { ModelToggle } from "@/features/ai/components/model-toggle";
import { UserMenu } from "@/features/auth/components/user-menu";

import { Id } from "@/lib/data/app-types";
import { useProject, useRenameProject } from "../hooks/use-projects";
import { DeleteProjectButton } from "./delete-project-button";

export const Navbar = ({
  projectId
}: {
  projectId: Id<"projects">;
}) => {
  const project = useProject(projectId);
  const renameProject = useRenameProject();

  const [isRenaming, setIsRenaming] = useState(false);
  const [name, setName] = useState("");

  const handleStartRename = () => {
    if (!project) return;
    setName(project.name);
    setIsRenaming(true);
  };

  const handleSubmit = () => {
    if (!project) return;
    setIsRenaming(false);

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName === project.name) return;

    renameProject({ id: projectId, name: trimmedName });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    } else if (e.key === "Escape") {
      setIsRenaming(false);
    }
  };

  return (
    <nav className="border-b border-[color:var(--workspace-border)] bg-workspace-panel/90 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 px-3 py-3 md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            className="flex shrink-0 items-center gap-3 rounded-full border border-panel-border bg-panel-elevated px-3 py-2 shadow-[0_10px_30px_rgba(15,23,42,0.12)]"
            href="/"
          >
            <Image alt="Torq-AI" height={28} src="/logo.svg" width={28} />
            <div>
              <p className="text-[10px] font-semibold tracking-[0.28em] text-vscode-blue uppercase">
                Torq-AI
              </p>
              <p className="text-sm font-semibold tracking-[-0.02em]">
                Workspace
              </p>
            </div>
          </Link>
          <div className="min-w-0 rounded-full border border-panel-border bg-panel-elevated px-4 py-2 shadow-[0_10px_26px_rgba(15,23,42,0.1)]">
            <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
              Current project
            </p>
            <div className="mt-1">
              {isRenaming ? (
                <input
                  autoFocus
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={(e) => e.currentTarget.select()}
                  onBlur={handleSubmit}
                  onKeyDown={handleKeyDown}
                  className="max-w-64 truncate bg-transparent text-sm font-semibold tracking-[-0.02em] text-foreground outline-none focus:ring-1 focus:ring-inset focus:ring-ring"
                />
              ) : (
                <button
                  className="max-w-64 truncate text-left text-sm font-semibold tracking-[-0.02em] text-foreground transition-colors hover:text-vscode-blue"
                  onClick={handleStartRename}
                >
                  {project?.name ?? "Loading..."}
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {project?.importStatus === "importing" ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 rounded-full border border-panel-border bg-panel-elevated px-3 py-2 text-sm text-muted-foreground shadow-[0_10px_24px_rgba(15,23,42,0.1)]">
                  <LoaderIcon className="size-4 animate-spin" />
                  Importing...
                </div>
              </TooltipTrigger>
              <TooltipContent>Importing the repository into Torq-AI</TooltipContent>
            </Tooltip>
          ) : project?.importStatus === "failed" ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 shadow-[0_10px_24px_rgba(15,23,42,0.1)]">
                  <AlertTriangleIcon className="size-4" />
                  Import failed
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {project.importError || "Unable to import the repository"}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 rounded-full border border-panel-border bg-panel-elevated px-3 py-2 text-sm text-muted-foreground shadow-[0_10px_24px_rgba(15,23,42,0.1)]">
                  <CloudCheckIcon className="size-4 text-vscode-green" />
                  Saved{" "}
                  {project?.updatedAt
                    ? formatDistanceToNow(project.updatedAt, { addSuffix: true })
                    : "recently"}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {project?.updatedAt
                  ? `Last change ${formatDistanceToNow(project.updatedAt, {
                      addSuffix: true,
                    })}`
                  : "Waiting for project data"}
              </TooltipContent>
            </Tooltip>
          )}
          {project ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <DeleteProjectButton
                    projectId={projectId}
                    projectName={project.name}
                    redirectTo="/"
                    trigger={
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="outline"
                        className="rounded-full border-panel-border bg-panel-elevated text-muted-foreground shadow-[0_10px_24px_rgba(15,23,42,0.1)] hover:text-destructive"
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    }
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>Delete project</TooltipContent>
            </Tooltip>
          ) : null}
          <ModelToggle className="max-w-[188px]" />
          <ThemeToggle className="h-9 w-[78px]" />
          <div className="rounded-full border border-panel-border bg-panel-elevated p-1 shadow-[0_10px_24px_rgba(15,23,42,0.1)]">
            <UserMenu />
          </div>
        </div>
      </div>
    </nav>
  )
};
