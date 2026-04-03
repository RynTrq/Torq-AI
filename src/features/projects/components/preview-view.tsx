"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import ky, { HTTPError } from "ky";
import { Allotment } from "allotment";
import {
  Code2Icon,
  Loader2Icon,
  TerminalSquareIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
  PlayIcon,
  FileCode2Icon,
  GlobeIcon,
} from "lucide-react";
import { Streamdown } from "streamdown";

import { useWebContainer } from "@/features/preview/hooks/use-webcontainer";
import { PreviewSettingsPopover } from "@/features/preview/components/preview-settings-popover";
import { PreviewTerminal } from "@/features/preview/components/preview-terminal";

import { Button } from "@/components/ui/button";

import { useProject } from "../hooks/use-projects";
import { useFile, useFilePath } from "../hooks/use-files";
import { useEditor } from "@/features/editor/hooks/use-editor";
import {
  getPreviewKind,
  getRunnableLanguageLabel,
} from "@/lib/project-files";

import { Id } from "../../../../convex/_generated/dataModel";

const EMPTY_RUN_STATE = {
  status: "idle" as const,
  command: null as string | null,
  output: "",
  exitCode: null as number | null,
  error: null as string | null,
};

export const PreviewView = ({ projectId }: { projectId: Id<"projects"> }) => {
  const project = useProject(projectId);
  const { activeTabId } = useEditor(projectId);
  const activeFile = useFile(activeTabId);
  const activeFilePath = useFilePath(activeTabId);
  const [showTerminal, setShowTerminal] = useState(true);
  const [preferredMode, setPreferredMode] = useState<{
    tabId: Id<"files"> | null;
    mode: "workspace" | "file" | "run" | null;
  }>({
    tabId: null,
    mode: null,
  });
  const [runState, setRunState] = useState<{
    fileId: Id<"files"> | null;
    status: "idle" | "running" | "success" | "error";
    command: string | null;
    output: string;
    exitCode: number | null;
    error: string | null;
  }>({
    fileId: null,
    ...EMPTY_RUN_STATE,
  });

  const {
    status, previewUrl, error, restart, terminalOutput
  } = useWebContainer({
    projectId,
    enabled: true,
    settings: project?.settings,
  });

  const isLoading = status === "booting" || status === "installing";
  const previewKind = activeFile ? getPreviewKind(activeFile.name) : null;
  const runnableLanguageLabel = activeFile
    ? getRunnableLanguageLabel(activeFile.name)
    : null;
  const relativeFilePath = activeFilePath?.map((item) => item.name).join("/") ?? null;
  const currentRunState = runState.fileId === activeTabId ? runState : {
    fileId: activeTabId ?? null,
    ...EMPTY_RUN_STATE,
  };
  const mode = useMemo(() => {
    const selectedMode = preferredMode.tabId === activeTabId
      ? preferredMode.mode
      : null;

    if (selectedMode === "run" && runnableLanguageLabel) {
      return "run";
    }

    if (selectedMode === "file" && previewKind) {
      return "file";
    }

    if (selectedMode === "workspace") {
      return "workspace";
    }

    return previewKind ? "file" : "workspace";
  }, [activeTabId, preferredMode.mode, preferredMode.tabId, previewKind, runnableLanguageLabel]);

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

  const runFile = async () => {
    if (!activeFile) {
      return;
    }

    setPreferredMode({
      tabId: activeFile._id,
      mode: "run",
    });
    setRunState({
      fileId: activeFile._id,
      ...EMPTY_RUN_STATE,
      status: "running",
    });

    try {
      const response = await ky
        .post("/api/projects/run-file", {
          json: {
            projectId,
            fileId: activeFile._id,
          },
        })
        .json<{
          command: string;
          exitCode: number | null;
          output: string;
        }>();

      setRunState({
        fileId: activeFile._id,
        status: "success",
        command: response.command,
        output: response.output,
        exitCode: response.exitCode,
        error: null,
      });
    } catch (caughtError) {
      let errorMessage = "Unable to run this file.";
      let command: string | null = null;

      if (caughtError instanceof HTTPError) {
        try {
          const body = await caughtError.response.json<{
            error?: string;
            command?: string;
            output?: string;
            exitCode?: number | null;
          }>();

          errorMessage = body.error || body.output || errorMessage;
          command = body.command ?? null;

          setRunState({
            fileId: activeFile._id,
            status: "error",
            command,
            output: body.output || "",
            exitCode: body.exitCode ?? null,
            error: errorMessage,
          });
          return;
        } catch {
          // Fall back to the generic error below.
        }
      }

      if (caughtError instanceof Error) {
        errorMessage = caughtError.message;
      }

      setRunState({
        fileId: activeFile._id,
        status: "error",
        command,
        output: "",
        exitCode: null,
        error: errorMessage,
      });
    }
  };

  const renderWorkspacePreview = () => (
    <>
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

      {isLoading && !error && (
        <div className="size-full flex items-center justify-center text-muted-foreground">
          <div className="flex flex-col items-center gap-2 max-w-md mx-auto text-center">
            <Loader2Icon className="size-6 animate-spin" />
            <p className="text-sm font-medium">Installing...</p>
          </div>
        </div>
      )}

      {previewUrl && !error && (
        <iframe
          src={previewUrl}
          className="size-full border-0"
          title="Workspace preview"
        />
      )}

      {!previewUrl && !error && !isLoading && (
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
              HTML, Markdown, images, and simple text formats can render here.
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

  const renderRunResult = () => {
    if (!activeFile || !runnableLanguageLabel) {
      return (
        <div className="size-full flex items-center justify-center text-muted-foreground">
          <div className="max-w-md text-center">
            <p className="text-sm font-medium">Open a runnable file first</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Torq-AI can run JavaScript, Python, C, C++, and Java files from
              the active project locally.
            </p>
          </div>
        </div>
      );
    }

    if (currentRunState.status === "idle") {
      return (
        <div className="size-full flex items-center justify-center text-muted-foreground">
          <div className="max-w-md text-center">
            <p className="text-sm font-medium">
              Ready to run {activeFile.name}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Run the selected {runnableLanguageLabel} file locally and inspect
              the output here.
            </p>
            <Button className="mt-4" onClick={() => void runFile()}>
              <PlayIcon className="size-4" />
              Run file
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col bg-editor-pane">
        <div className="border-b border-[color:var(--workspace-border)] px-4 py-3">
          <p className="font-mono text-xs text-muted-foreground">
            {currentRunState.command ?? "Running..."}
          </p>
          {currentRunState.exitCode !== null ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Exit code: {currentRunState.exitCode}
            </p>
          ) : null}
          {currentRunState.error ? (
            <p className="mt-2 text-sm text-rose-400">{currentRunState.error}</p>
          ) : null}
        </div>
        <div className="flex-1 overflow-auto p-4">
          <pre className="whitespace-pre-wrap rounded-2xl border border-[color:var(--workspace-border)] bg-workspace-panel/80 p-4 font-mono text-sm leading-6 text-foreground shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
            {currentRunState.status === "running"
              ? "Running..."
              : currentRunState.output || "Process finished without output."}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col bg-editor-pane">
      <div className="flex h-10 shrink-0 items-center border-b border-[color:var(--workspace-border)] bg-workspace-sidebar">
        <Button
          size="sm"
          variant="ghost"
          className="h-full rounded-none"
          disabled={isLoading}
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
            {runnableLanguageLabel ? (
              <Button
                size="sm"
                variant={mode === "run" ? "secondary" : "ghost"}
                className="h-7 px-2"
                onClick={() => {
                  setPreferredMode({
                    tabId: activeTabId ?? null,
                    mode: "run",
                  });
                  if (currentRunState.status === "idle") {
                    void runFile();
                  }
                }}
              >
                <Code2Icon className="size-3.5" />
                Run {runnableLanguageLabel}
              </Button>
            ) : null}
          </div>
          <div className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
            {mode === "workspace" && isLoading && (
            <div className="flex items-center gap-1.5">
              <Loader2Icon className="size-3 animate-spin" />
              {status === "booting" ? "Starting..." : "Installing..."}
            </div>
            )}
            {mode === "workspace" && previewUrl && <span className="truncate">{previewUrl}</span>}
            {mode === "workspace" && !isLoading && !previewUrl && !error && <span>Ready to preview</span>}
            {mode === "file" && activeFile && (
              <span className="truncate">
                Previewing {relativeFilePath ?? activeFile.name}
              </span>
            )}
            {mode === "run" && activeFile && (
              <span className="truncate">
                Running {relativeFilePath ?? activeFile.name}
              </span>
            )}
          </div>
        </div>

        {runnableLanguageLabel ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-full rounded-none"
            title={`Run ${activeFile?.name ?? "file"}`}
            onClick={() => void runFile()}
          >
            <PlayIcon className="size-3" />
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          className="h-full rounded-none"
          title="Toggle terminal"
          onClick={() => setShowTerminal((value) => !value)}
        >
          <TerminalSquareIcon className="size-3" />
        </Button>
        <PreviewSettingsPopover
          projectId={projectId}
          initialValues={project?.settings}
          onSave={restart}
        />
      </div>

      <div className="flex-1 min-h-0">
        <Allotment vertical>
          <Allotment.Pane>
            {mode === "workspace" && renderWorkspacePreview()}
            {mode === "file" && renderFilePreview()}
            {mode === "run" && renderRunResult()}
          </Allotment.Pane>

          {showTerminal && (
            <Allotment.Pane minSize={100} maxSize={500} preferredSize={200}>
              <div className="flex h-full flex-col border-t border-[color:var(--workspace-border)] bg-workspace-panel">
                <div className="flex h-8 shrink-0 items-center gap-1.5 border-b border-[color:var(--workspace-border)] px-3 text-xs text-muted-foreground">
                  <TerminalSquareIcon className="size-3" />
                  Terminal
                </div>
                <PreviewTerminal output={terminalOutput} />
              </div>
            </Allotment.Pane>
          )}
        </Allotment>
      </div>
    </div>
  );
};
