"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Allotment } from "allotment";

import { ConversationSidebar } from "@/features/conversations/components/conversation-sidebar";

import { Navbar } from "./navbar";
import { Id } from "@/lib/data/app-types";
import { useProject } from "../hooks/use-projects";

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 800;
const DEFAULT_CONVERSATION_SIDEBAR_WIDTH = 400;
const DEFAULT_MAIN_SIZE = 1000;

export const ProjectIdLayout = ({
  children,
  projectId,
}: {
  children: React.ReactNode;
  projectId: Id<"projects">;
}) => {
  const router = useRouter();
  const project = useProject(projectId);

  useEffect(() => {
    if (project === null) {
      router.replace("/");
      router.refresh();
    }
  }, [project, router]);

  if (project === undefined) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-workspace-panel text-sm text-muted-foreground">
        Loading workspace...
      </div>
    );
  }

  if (project === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-workspace-panel text-sm text-muted-foreground">
        Returning to your workspaces...
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-workspace-panel text-foreground">
      <Navbar projectId={projectId} />
      <div className="flex-1 flex overflow-hidden">
        <Allotment
          className="flex-1"
          defaultSizes={[
            DEFAULT_CONVERSATION_SIDEBAR_WIDTH,
            DEFAULT_MAIN_SIZE
          ]}
        >
          <Allotment.Pane
            snap
            minSize={MIN_SIDEBAR_WIDTH}
            maxSize={MAX_SIDEBAR_WIDTH}
            preferredSize={DEFAULT_CONVERSATION_SIDEBAR_WIDTH}
          >
            <ConversationSidebar projectId={projectId} />
          </Allotment.Pane>
          <Allotment.Pane>
            {children}
          </Allotment.Pane>
        </Allotment>
      </div>
    </div>
  );
};
