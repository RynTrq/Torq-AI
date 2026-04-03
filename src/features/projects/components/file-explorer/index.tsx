import { useState } from "react"
import { ChevronRightIcon, CopyMinusIcon, FilePlusCornerIcon, FolderPlusIcon } from "lucide-react"
import { toast } from "sonner";

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

import { useProject } from "../../hooks/use-projects"
import { Id } from "../../../../../convex/_generated/dataModel"
import { 
  useCreateFile,
  useCreateFolder,
  useFolderContents
} from "../../hooks/use-files"
import { CreateInput } from "./create-input"
import { CreateFileDialog } from "./create-file-dialog"
import { LoadingRow } from "./loading-row"
import { Tree } from "./tree"

export const FileExplorer = ({ 
  projectId
}: { 
  projectId: Id<"projects">
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [collapseKey, setCollapseKey] = useState(0);
  const [creating, setCreating] = useState<"file" | "folder" | null>(
    null
  );
  const [createFileParentId, setCreateFileParentId] = useState<
    Id<"files"> | undefined
  >();
  const [createFileDialogOpen, setCreateFileDialogOpen] = useState(false);

  const project = useProject(projectId);
  const rootFiles = useFolderContents({
    projectId,
    enabled: isOpen,
  });

  const createFile = useCreateFile();
  const createFolder = useCreateFolder();
  const handleCreate = (name: string) => {
    setCreating(null);

    if (creating === "file") {
      void createFile({
        projectId,
        name,
        content: "",
        parentId: undefined,
      }).catch((error: unknown) => {
        toast.error(
          error instanceof Error
            ? error.message.replace(/^Uncaught Error:\s*/, "")
            : "Unable to create file",
        );
      });
    } else {
      void createFolder({
        projectId,
        name,
        parentId: undefined,
      }).catch((error: unknown) => {
        toast.error(
          error instanceof Error
            ? error.message.replace(/^Uncaught Error:\s*/, "")
            : "Unable to create folder",
        );
      });
    }
  };

  const handleOpenCreateFileDialog = (parentId?: Id<"files">) => {
    setCreateFileParentId(parentId);
    setCreateFileDialogOpen(true);
  };

  return (
    <div className="h-full bg-workspace-sidebar text-foreground">
      <ScrollArea className="h-full">
        <div className="border-b border-[color:var(--workspace-border)] px-3 py-3">
          <p className="text-[10px] font-semibold tracking-[0.24em] text-muted-foreground uppercase">
            Explorer
          </p>
          <div className="mt-2 rounded-xl border border-panel-border bg-panel-elevated px-3 py-2 text-sm font-semibold tracking-[-0.02em] shadow-[0_10px_20px_rgba(15,23,42,0.08)]">
            {project?.name ?? "Loading..."}
          </div>
        </div>
        <div
          role="button"
          onClick={() => setIsOpen((value) => !value)}
          className="group/project flex h-8 w-full cursor-pointer items-center gap-0.5 bg-workspace-panel px-2 text-left font-semibold"
        >
          <ChevronRightIcon
            className={cn(
              "size-4 shrink-0 text-muted-foreground",
              isOpen && "rotate-90"
            )}
          />
          <p className="line-clamp-1 text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
            Files
          </p>
          <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-none duration-0 group-hover/project:opacity-100">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setIsOpen(true);
                handleOpenCreateFileDialog();
              }}
              variant="highlight"
              size="icon-xs"
            >
              <FilePlusCornerIcon className="size-3.5" />
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setIsOpen(true);
                setCreating("folder");
              }}
              variant="highlight"
              size="icon-xs"
            >
              <FolderPlusIcon className="size-3.5" />
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setCollapseKey((prev) => prev + 1);
              }}
              variant="highlight"
              size="icon-xs"
            >
              <CopyMinusIcon className="size-3.5" />
            </Button>
          </div>
        </div>
        {isOpen && (
          <div className="py-1">
            {rootFiles === undefined && <LoadingRow level={0} />}
            {creating && (
              <CreateInput
                type={creating}
                level={0}
                onSubmit={handleCreate}
                onCancel={() => setCreating(null)}
              />
            )}
            {rootFiles?.map((item) => (
              <Tree
                key={`${item._id}-${collapseKey}`}
                item={item}
                level={0}
                projectId={projectId}
                onCreateFileRequest={handleOpenCreateFileDialog}
              />
            ))}
          </div>
        )}
      </ScrollArea>
      <CreateFileDialog
        open={createFileDialogOpen}
        onOpenChange={setCreateFileDialogOpen}
        projectId={projectId}
        parentId={createFileParentId}
      />
    </div>
  )
}
