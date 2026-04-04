import Image from "next/image";
import { useEffect, useRef } from "react";

import { useFile, useUpdateFile } from "@/features/projects/hooks/use-files";

import { CodeEditor } from "./code-editor";
import { useEditor } from "../hooks/use-editor";
import { TopNavigation } from "./top-navigation";
import { FileBreadcrumbs } from "./file-breadcrumbs";
import { Id } from "@/lib/data/app-types";
import { AlertTriangleIcon } from "lucide-react";

const DEBOUNCE_MS = 1500;

export const EditorView = ({ projectId }: { projectId: Id<"projects"> }) => {
  const { activeTabId } = useEditor(projectId);
  const activeFile = useFile(activeTabId);
  const updateFile = useUpdateFile();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isActiveFileBinary = activeFile && activeFile.storageId;
  const isActiveFileText = activeFile && !activeFile.storageId;

  // Cleanup pending debounced updates on unmount or file change
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [activeTabId]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center">
        <TopNavigation projectId={projectId} />
      </div>
      {activeTabId && <FileBreadcrumbs projectId={projectId} />}
      <div className="flex-1 min-h-0 bg-editor-pane">
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
        {isActiveFileText && (
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
      </div>
    </div>
  );
};
