import { cn } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuContent,
  ContextMenuTrigger,
  ContextMenuShortcut,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";

import { getItemPadding } from "./constants";
import { Doc } from "@/lib/data/app-types";

export const TreeItemWrapper = ({
  item,
  children,
  level,
  isActive,
  onClick,
  onDoubleClick,
  onRename,
  onDelete,
  onCreateFile,
  onCreateFolder,
}: {
  item: Doc<"files">;
  children: React.ReactNode;
  level: number;
  isActive?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onCreateFile?: () => void;
  onCreateFolder?: () => void;
}) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onRename?.();
            }
          }}
          className={cn(
            "group relative flex h-6 w-full items-center gap-1 rounded-md outline-none transition-colors hover:bg-workspace-hover focus:ring-1 focus:ring-inset focus:ring-ring",
            isActive && "bg-workspace-active text-foreground",
          )}
          style={{ paddingLeft: getItemPadding(level, item.type === "file") }}
        >
          {children}
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent
        onCloseAutoFocus={(e) => e.preventDefault()}
        className="w-64"
      >
        {item.type === "folder" && (
          <>
            <ContextMenuItem 
              onClick={onCreateFile}
              className="text-sm"
            >
              New File...
            </ContextMenuItem>
            <ContextMenuItem 
              onClick={onCreateFolder}
              className="text-sm"
            >
              New Folder...
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
         <ContextMenuItem 
          onClick={onRename}
          className="text-sm"
        >
          Rename...
          <ContextMenuShortcut>
            Enter
          </ContextMenuShortcut>
        </ContextMenuItem>
         <ContextMenuItem 
          onClick={onDelete}
          className="text-sm"
        >
          Delete Permanently
          <ContextMenuShortcut>
            ⌘Backspace
          </ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
