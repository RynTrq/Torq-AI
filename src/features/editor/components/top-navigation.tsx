import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

import { useFile } from "@/features/projects/hooks/use-files";

import { useEditor } from "../hooks/use-editor";
import { Id } from "../../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { FileIcon } from "@react-symbols/icons/utils";
import { XIcon } from "lucide-react";

const Tab = ({
  fileId,
  isFirst,
  projectId,
}: {
  fileId: Id<"files">;
  isFirst: boolean;
  projectId: Id<"projects">;
}) => {
  const file = useFile(fileId);
  const {
    activeTabId,
    previewTabId,
    setActiveTab,
    openFile,
    closeTab,
  } = useEditor(projectId);

  const isActive = activeTabId === fileId;
  const isPreview = previewTabId === fileId;
  const fileName = file?.name ?? "Loading...";

  return (
    <div
      onClick={() => setActiveTab(fileId)}
      onDoubleClick={() => openFile(fileId, { pinned: true })}
      className={cn(
        "group flex h-10 cursor-pointer items-center gap-2 border-r border-[color:var(--workspace-border)] bg-workspace-panel px-3 text-muted-foreground transition-colors hover:bg-workspace-hover",
        isActive &&
          "bg-editor-pane text-foreground shadow-[0_10px_24px_rgba(15,23,42,0.08)]",
        isFirst && "border-l border-[color:var(--workspace-border)]"
      )}
    >
      {file === undefined ? (
        <Spinner className="text-ring" />
      ) : (
        <FileIcon fileName={fileName} autoAssign className="size-4" />
      )}
      <span className={cn(
        "text-sm whitespace-nowrap",
        isPreview && "italic"
      )}>
        {fileName}
      </span>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          closeTab(fileId);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            closeTab(fileId);
          }
        }}
        className={cn(
          "rounded-sm p-0.5 opacity-0 transition-opacity hover:bg-white/10 group-hover:opacity-100",
          isActive && "opacity-100"
        )}
      >
        <XIcon className="size-3.5" />
      </button>
    </div>
  );
};

export const TopNavigation = ({ 
  projectId
}: { 
  projectId: Id<"projects">
}) => {
  const { openTabs } = useEditor(projectId);

  return (
    <ScrollArea className="flex-1">
      <nav className="flex h-10 items-center border-b border-[color:var(--workspace-border)] bg-workspace-sidebar">
        {openTabs.map((fileId, index) => (
          <Tab
            key={fileId}
            fileId={fileId}
            isFirst={index === 0}
            projectId={projectId}
          />
        ))}
      </nav>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};
