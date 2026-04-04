import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import ky, { HTTPError } from "ky";
import { Allotment } from "allotment";

import { useFile, useUpdateFile } from "@/features/projects/hooks/use-files";

import { CodeEditor } from "./code-editor";
import { useEditor } from "../hooks/use-editor";
import { TopNavigation } from "./top-navigation";
import { FileBreadcrumbs } from "./file-breadcrumbs";
import { Id } from "@/lib/data/app-types";
import {
  AlertTriangleIcon,
  Loader2Icon,
  PlayIcon,
  TerminalSquareIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRunnableLanguageLabel } from "@/lib/project-files";
import { RunTerminalPanel } from "./run-terminal-panel";

const DEBOUNCE_MS = 1500;
const EMPTY_RUN_STATE = {
  status: "idle" as const,
  fileId: null as Id<"files"> | null,
  fileName: null as string | null,
  command: null as string | null,
  output: "",
  exitCode: null as number | null,
  error: null as string | null,
};

export const EditorView = ({ projectId }: { projectId: Id<"projects"> }) => {
  const { activeTabId } = useEditor(projectId);
  const activeFile = useFile(activeTabId);
  const updateFile = useUpdateFile();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [runState, setRunState] = useState<{
    status: "idle" | "running" | "success" | "error";
    fileId: Id<"files"> | null;
    fileName: string | null;
    command: string | null;
    output: string;
    exitCode: number | null;
    error: string | null;
  }>(EMPTY_RUN_STATE);

  const isActiveFileBinary = activeFile && activeFile.storageId;
  const isActiveFileText = activeFile && !activeFile.storageId;
  const runnableLanguageLabel = activeFile
    ? getRunnableLanguageLabel(activeFile.name)
    : null;
  const canRunActiveFile = Boolean(activeFile && runnableLanguageLabel);

  // Cleanup pending debounced updates on unmount or file change
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [activeTabId]);

  const runFile = async () => {
    if (!activeFile || !canRunActiveFile) {
      return;
    }

    setShowTerminal(true);
    setRunState({
      ...EMPTY_RUN_STATE,
      status: "running",
      fileId: activeFile._id,
      fileName: activeFile.name,
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
        status: "success",
        fileId: activeFile._id,
        fileName: activeFile.name,
        command: response.command,
        output: response.output,
        exitCode: response.exitCode,
        error: null,
      });
    } catch (caughtError) {
      let errorMessage = "Unable to run this file.";
      let command: string | null = null;
      let output = "";
      let exitCode: number | null = null;

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
          output = body.output || "";
          exitCode = body.exitCode ?? null;
        } catch {
          // Fall back to the generic error below.
        }
      } else if (caughtError instanceof Error) {
        errorMessage = caughtError.message;
      }

      setRunState({
        status: "error",
        fileId: activeFile._id,
        fileName: activeFile.name,
        command,
        output,
        exitCode,
        error: errorMessage,
      });
    }
  };

  const renderEditorBody = () => (
    <>
      {!activeFile && (
        <div className="flex size-full items-center justify-center p-8">
          <div className="flex max-w-md flex-col items-center gap-4 rounded-[1.8rem] border border-[color:var(--workspace-border)] bg-workspace-panel/60 px-8 py-10 text-center shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
            <Image
              src="/logo-alt.svg"
              alt="Torq-AI"
              width={64}
              height={76}
              className="h-auto w-auto opacity-90"
              unoptimized
            />
            <div className="space-y-2">
              <p className="text-lg font-semibold tracking-[-0.03em]">
                Open a file to start shaping the build
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                Torq-AI keeps tabs, breadcrumbs, and AI-assisted editing ready
                the moment you jump into a file.
              </p>
            </div>
          </div>
        </div>
      )}
      {isActiveFileText && activeFile && (
        <CodeEditor
          key={activeFile._id}
          fileName={activeFile.name}
          initialValue={activeFile.content}
          onChange={(content: string) => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
              updateFile({ id: activeFile._id, content });
            }, DEBOUNCE_MS);
          }}
        />
      )}
      {isActiveFileBinary && (
        <div className="size-full flex items-center justify-center p-8">
          <div className="flex max-w-md flex-col items-center gap-2.5 rounded-[1.8rem] border border-[color:var(--workspace-border)] bg-workspace-panel/60 px-8 py-10 text-center shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
            <AlertTriangleIcon className="size-10 text-yellow-500" />
            <p className="text-sm">
              The file is not displayed in the text editor because it is either binary or uses an unsupported text encoding.
            </p>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center">
        <TopNavigation projectId={projectId} />
      </div>
      {activeTabId && <FileBreadcrumbs projectId={projectId} />}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-[color:var(--workspace-border)] bg-workspace-sidebar px-3">
        <div className="min-w-0 text-xs text-muted-foreground">
          {canRunActiveFile && activeFile ? (
            <span className="truncate">
              Run {activeFile.name} in the integrated terminal
            </span>
          ) : activeFile ? (
            <span className="truncate">
              Code editing view for {activeFile.name}
            </span>
          ) : (
            <span>Choose a file from the explorer to begin.</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowTerminal((value) => !value)}
          >
            {showTerminal ? (
              <>
                <XIcon className="size-4" />
                Hide terminal
              </>
            ) : (
              <>
                <TerminalSquareIcon className="size-4" />
                Show terminal
              </>
            )}
          </Button>
          <Button
            size="sm"
            disabled={!canRunActiveFile || runState.status === "running"}
            onClick={() => void runFile()}
          >
            {runState.status === "running" && runState.fileId === activeFile?._id ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <PlayIcon className="size-4" />
            )}
            {canRunActiveFile && runnableLanguageLabel
              ? `Run ${runnableLanguageLabel}`
              : "Run code"}
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0 bg-editor-pane">
        {showTerminal ? (
          <Allotment vertical>
            <Allotment.Pane>
              {renderEditorBody()}
            </Allotment.Pane>
            <Allotment.Pane minSize={140} preferredSize={220} maxSize={520}>
              <div className="flex h-full flex-col border-t border-[color:var(--workspace-border)] bg-workspace-panel">
                <div className="flex min-h-0 items-center justify-between gap-3 border-b border-[color:var(--workspace-border)] px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-foreground">
                      {runState.fileName
                        ? `Terminal · ${runState.fileName}`
                        : "Integrated terminal"}
                    </p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {runState.command ??
                        (canRunActiveFile && activeFile
                          ? `Ready to run ${activeFile.name}`
                          : "Open a runnable file to execute code here.")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    {runState.exitCode !== null ? (
                      <span>Exit {runState.exitCode}</span>
                    ) : null}
                    {runState.error ? (
                      <span className="text-rose-400">{runState.error}</span>
                    ) : null}
                  </div>
                </div>
                <RunTerminalPanel
                  output={
                    runState.status === "idle"
                      ? "Torq-AI terminal ready.\r\nSelect a JavaScript, Python, C, C++, or Java file and run it from the code view.\r\n"
                      : runState.status === "running"
                        ? "Running...\r\n"
                        : `${runState.output || "Process finished without output."}\r\n`
                  }
                />
              </div>
            </Allotment.Pane>
          </Allotment>
        ) : (
          renderEditorBody()
        )}
      </div>
    </div>
  );
};
