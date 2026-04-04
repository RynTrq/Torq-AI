"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  Loader2Icon,
  AlertTriangleIcon,
  RefreshCwIcon,
  FileCode2Icon,
  GlobeIcon,
} from "lucide-react";
import { Streamdown } from "streamdown";

import { useWebContainer } from "@/features/preview/hooks/use-webcontainer";
import { PreviewSettingsPopover } from "@/features/preview/components/preview-settings-popover";

import { Button } from "@/components/ui/button";

import { useProject } from "../hooks/use-projects";
import { useFile, useFilePath, useFiles } from "../hooks/use-files";
import { useEditor } from "@/features/editor/hooks/use-editor";
import {
  getPreviewKind,
} from "@/lib/project-files";

import { Id } from "@/lib/data/app-types";

export const PreviewView = ({ projectId }: { projectId: Id<"projects"> }) => {
  const project = useProject(projectId);
  const files = useFiles(projectId);
  const { activeTabId } = useEditor(projectId);
  const activeFile = useFile(activeTabId);
  const activeFilePath = useFilePath(activeTabId);
  const [preferredMode, setPreferredMode] = useState<{
    tabId: Id<"files"> | null;
    mode: "workspace" | "file" | null;
  }>({
    tabId: null,
    mode: null,
  });

  const hasPackageJson = useMemo(
    () => Boolean(files?.some((file) => file.type === "file" && file.name === "package.json")),
    [files],
  );
  const workspacePreviewEnabled = Boolean(
    project?.settings?.devCommand?.trim() ||
      project?.settings?.installCommand?.trim() ||
      hasPackageJson,
  );

  const {
    status, previewUrl, error, restart
  } = useWebContainer({
    projectId,
    enabled: workspacePreviewEnabled,
    settings: project?.settings,
  });

  const isLoading = status === "booting" || status === "installing";
  const previewKind = activeFile ? getPreviewKind(activeFile.name) : null;
  const relativeFilePath = activeFilePath?.map((item) => item.name).join("/") ?? null;
  const mode = useMemo(() => {
    const selectedMode = preferredMode.tabId === activeTabId
      ? preferredMode.mode
      : null;

    if (selectedMode === "file" && previewKind) {
      return "file";
    }

    if (selectedMode === "workspace") {
      return "workspace";
    }

    return previewKind ? "file" : "workspace";
  }, [activeTabId, preferredMode.mode, preferredMode.tabId, previewKind]);

  const filePreviewUrl = useMemo(() => {
    if (!relativeFilePath || !activeFile) {
      return null;
    }

    if (!previewKind || previewKind === "markdown" || previewKind === "json" || previewKind === "text") {
      return null;
    }

    return `/api/projects/${projectId}/preview/${relativeFilePath
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/")}`;
  }, [activeFile, previewKind, projectId, relativeFilePath]);

  const renderWorkspacePreview = () => (
    <>
      {!workspacePreviewEnabled && (
        <div className="size-full flex items-center justify-center text-muted-foreground">
          <div className="flex flex-col items-center gap-2 max-w-md mx-auto text-center">
            <GlobeIcon className="size-6" />
            <p className="text-sm font-medium">Workspace preview is not configured yet</p>
            <p className="text-sm text-muted-foreground">
              Add a <code>package.json</code> or set install and start commands in Preview settings to boot a web workspace.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="size-full flex items-center justify-center text-muted-foreground">
          <div className="flex flex-col items-center gap-2 max-w-md mx-auto text-center">
            <AlertTriangleIcon className="size-6" />
            <p className="text-sm font-medium">{error}</p>
            <Button size="sm" variant="outline" onClick={restart}>
              <RefreshCwIcon className="size-4" />
              Restart
            </Button>
          </div>
        </div>
      )}

      {workspacePreviewEnabled && isLoading && !error && (
        <div className="size-full flex items-center justify-center text-muted-foreground">
          <div className="flex flex-col items-center gap-2 max-w-md mx-auto text-center">
            <Loader2Icon className="size-6 animate-spin" />
            <p className="text-sm font-medium">Installing...</p>
          </div>
        </div>
      )}

      {workspacePreviewEnabled && previewUrl && !error && (
        <iframe
          src={previewUrl}
          className="size-full border-0"
          title="Workspace preview"
        />
      )}

      {workspacePreviewEnabled && !previewUrl && !error && !isLoading && (
        <div className="size-full flex items-center justify-center text-muted-foreground">
          <div className="max-w-md text-center">
            <p className="text-sm font-medium">No workspace preview yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Configure install and dev commands, then restart the workspace preview.
            </p>
          </div>
        </div>
      )}
    </>
  );

  const renderFilePreview = () => {
    if (!activeFile || !previewKind) {
      return (
        <div className="size-full flex items-center justify-center text-muted-foreground">
          <div className="max-w-md text-center">
            <p className="text-sm font-medium">Open a previewable file first</p>
            <p className="mt-2 text-sm text-muted-foreground">
              HTML, Markdown, PDF, images, and simple text formats can render here.
            </p>
          </div>
        </div>
      );
    }

    if (previewKind === "markdown") {
      return (
        <div className="h-full overflow-auto bg-editor-pane px-6 py-6">
          <div className="mx-auto max-w-4xl rounded-[1.6rem] border border-[color:var(--workspace-border)] bg-workspace-panel/70 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
            <div className="streamdown prose prose-invert max-w-none">
              <Streamdown>{activeFile.content ?? ""}</Streamdown>
            </div>
          </div>
        </div>
      );
    }

    if (previewKind === "json" || previewKind === "text") {
      return (
        <div className="h-full overflow-auto bg-editor-pane p-6">
          <pre className="mx-auto max-w-5xl whitespace-pre-wrap rounded-[1.6rem] border border-[color:var(--workspace-border)] bg-workspace-panel/70 p-6 font-mono text-sm leading-6 text-foreground shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
            {activeFile.content ?? ""}
          </pre>
        </div>
      );
    }

    if (!filePreviewUrl) {
      return (
        <div className="size-full flex items-center justify-center text-muted-foreground">
          <p className="text-sm font-medium">Preview unavailable for this file.</p>
        </div>
      );
    }

    if (previewKind === "image" || previewKind === "svg") {
      return (
        <div className="flex size-full items-center justify-center bg-editor-pane p-6">
          <div className="relative h-full w-full overflow-hidden rounded-2xl border border-[color:var(--workspace-border)] bg-workspace-panel p-4 shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
            <Image
              alt={activeFile.name}
              src={filePreviewUrl}
              fill
              unoptimized
              className="object-contain p-4"
            />
          </div>
        </div>
      );
    }

    return (
      <iframe
        src={filePreviewUrl}
        className="size-full border-0 bg-white"
        title={`${activeFile.name} preview`}
      />
    );
  };

  return (
    <div className="flex h-full flex-col bg-editor-pane">
      <div className="flex h-10 shrink-0 items-center border-b border-[color:var(--workspace-border)] bg-workspace-sidebar">
        <Button
          size="sm"
          variant="ghost"
          className="h-full rounded-none"
          disabled={isLoading || !workspacePreviewEnabled}
          onClick={restart}
          title="Restart container"
        >
          <RefreshCwIcon className="size-3" />
        </Button>

        <div className="flex h-full min-w-0 flex-1 items-center gap-2 border-x border-[color:var(--workspace-border)] bg-editor-pane px-3">
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={mode === "workspace" ? "secondary" : "ghost"}
              className="h-7 px-2"
              onClick={() => setPreferredMode({
                tabId: activeTabId ?? null,
                mode: "workspace",
              })}
            >
              <GlobeIcon className="size-3.5" />
              Workspace
            </Button>
            {previewKind ? (
              <Button
                size="sm"
                variant={mode === "file" ? "secondary" : "ghost"}
                className="h-7 px-2"
                onClick={() => setPreferredMode({
                  tabId: activeTabId ?? null,
                  mode: "file",
                })}
              >
                <FileCode2Icon className="size-3.5" />
                File preview
              </Button>
            ) : null}
          </div>
          <div className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
            {mode === "workspace" && workspacePreviewEnabled && isLoading && (
            <div className="flex items-center gap-1.5">
              <Loader2Icon className="size-3 animate-spin" />
              {status === "booting" ? "Starting..." : "Installing..."}
            </div>
            )}
            {mode === "workspace" && workspacePreviewEnabled && previewUrl && <span className="truncate">{previewUrl}</span>}
            {mode === "workspace" && !workspacePreviewEnabled && <span>Add package.json or preview commands</span>}
            {mode === "workspace" && workspacePreviewEnabled && !isLoading && !previewUrl && !error && <span>Ready to preview</span>}
            {mode === "file" && activeFile && (
              <span className="truncate">
                Previewing {relativeFilePath ?? activeFile.name}
              </span>
            )}
          </div>
        </div>

        <PreviewSettingsPopover
          projectId={projectId}
          initialValues={project?.settings}
          onSave={restart}
        />
      </div>

      <div className="flex-1 min-h-0">
        {mode === "workspace" && renderWorkspacePreview()}
        {mode === "file" && renderFilePreview()}
      </div>
    </div>
  );
};
