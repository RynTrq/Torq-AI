"use client";

import { useState } from "react";
import { Allotment } from "allotment";
import { Code2Icon, MonitorPlayIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { EditorView } from "@/features/editor/components/editor-view";

import { FileExplorer } from "./file-explorer";
import { Id } from "../../../../convex/_generated/dataModel";
import { PreviewView } from "./preview-view";
import { ExportPopover } from "./export-popover";

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 800;
const DEFAULT_SIDEBAR_WIDTH = 350;
const DEFAULT_MAIN_SIZE = 1000;

const Tab = ({
  label,
  icon: Icon,
  isActive,
  onClick
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      onClick={onClick}
      type="button"
      className={cn(
        "flex h-full items-center gap-2 rounded-t-xl border border-transparent px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-workspace-hover hover:text-foreground",
        isActive &&
          "border-[color:var(--workspace-border)] border-b-transparent bg-editor-pane text-foreground shadow-[0_-8px_20px_rgba(15,23,42,0.06)]"
      )}
    >
      <Icon className="size-4" />
      <span className="text-sm">{label}</span>
    </button>
  );
};

export const ProjectIdView = ({ 
  projectId
}: { 
  projectId: Id<"projects">
}) => {
  const [activeView, setActiveView] = useState<"editor" | "preview">("editor");

  return (
    <div className="h-full flex flex-col">
      <nav className="flex h-12 items-end border-b border-[color:var(--workspace-border)] bg-workspace-panel px-2">
        <Tab
          label="Code"
          icon={Code2Icon}
          isActive={activeView === "editor"}
          onClick={() => setActiveView("editor")}
        />
        <Tab
          label="Preview"
          icon={MonitorPlayIcon}
          isActive={activeView === "preview"}
          onClick={() => setActiveView("preview")}
        />
        <div className="flex-1 flex justify-end h-full">
          <ExportPopover projectId={projectId} />
        </div>
      </nav>
      <div className="flex-1 relative">
        <div className={cn(
          "absolute inset-0",
          activeView === "editor" ? "visible" : "invisible"
        )}>
          <Allotment defaultSizes={[DEFAULT_SIDEBAR_WIDTH, DEFAULT_MAIN_SIZE]}>
            <Allotment.Pane
              snap
              minSize={MIN_SIDEBAR_WIDTH}
              maxSize={MAX_SIDEBAR_WIDTH}
              preferredSize={DEFAULT_SIDEBAR_WIDTH}
            >
              <FileExplorer projectId={projectId} />
            </Allotment.Pane>
            <Allotment.Pane>
              <EditorView projectId={projectId} />
            </Allotment.Pane>
          </Allotment>
        </div>
        <div className={cn(
          "absolute inset-0",
          activeView === "preview" ? "visible" : "invisible"
        )}>
          <PreviewView projectId={projectId} />
        </div>
      </div>
    </div>
  );
};
