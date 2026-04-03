import Link from "next/link";
import { FaGithub } from "react-icons/fa";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircleIcon,
  ArrowRightIcon,
  GlobeIcon,
  Loader2Icon,
  SparkleIcon,
  Trash2Icon,
} from "lucide-react";

import { Kbd } from "@/components/ui/kbd";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";

import { Doc } from "../../../../convex/_generated/dataModel";

import { useProjectsPartial } from "../hooks/use-projects";
import { DeleteProjectButton } from "./delete-project-button";

const formatTimestamp = (timestamp: number) => {
  return formatDistanceToNow(new Date(timestamp), { 
    addSuffix: true
  });
};

const getProjectIcon = (project: Doc<"projects">) => {
  if (project.importStatus === "completed") {
    return <FaGithub className="size-3.5 text-muted-foreground" />
  }

  if (project.importStatus === "failed") {
    return <AlertCircleIcon className="size-3.5 text-muted-foreground" />;
  }

  if (project.importStatus === "importing") {
    return (
      <Loader2Icon className="size-3.5 text-muted-foreground animate-spin" />
    );
  }

  return <GlobeIcon className="size-3.5 text-muted-foreground" />;
}

interface ProjectsListProps {
  onViewAll: () => void;
}

const ContinueCard = ({ 
  data
}: {
  data: Doc<"projects">;
}) => {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
        Last updated
      </span>
      <div className="relative">
        <Button
          variant="outline"
          asChild
          className="h-auto items-start justify-start rounded-[1.4rem] border-panel-border bg-panel-elevated p-4 pr-14 shadow-none hover:bg-panel"
        >
          <Link href={`/projects/${data._id}`} className="group">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                {getProjectIcon(data)}
                <span className="truncate font-semibold tracking-[-0.02em]">
                  {data.name}
                </span>
              </div>
              <ArrowRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
            <span className="text-xs text-muted-foreground">
              {formatTimestamp(data.updatedAt)}
            </span>
          </Link>
        </Button>
        <div className="absolute top-3 right-3">
          <DeleteProjectButton
            projectId={data._id}
            projectName={data.name}
            trigger={
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                className="border-panel-border bg-panel/90 text-muted-foreground hover:text-destructive"
              >
                <Trash2Icon className="size-4" />
              </Button>
            }
          />
        </div>
      </div>
    </div>
  )
};

const ProjectItem = ({ 
  data
}: {
  data: Doc<"projects">;
}) => {
  return (
    <div className="group flex w-full items-center gap-2 rounded-2xl px-1 py-1 transition-colors hover:bg-panel-elevated">
      <Link 
        href={`/projects/${data._id}`}
        className="flex min-w-0 flex-1 items-center justify-between rounded-xl px-2 py-2 text-sm font-medium text-foreground/65 transition-colors hover:text-foreground"
      >
        <div className="flex min-w-0 items-center gap-2">
          {getProjectIcon(data)}
          <span className="truncate">{data.name}</span>
        </div>
        <span className="pl-3 text-xs text-muted-foreground transition-colors group-hover:text-foreground/60">
          {formatTimestamp(data.updatedAt)}
        </span>
      </Link>
      <DeleteProjectButton
        projectId={data._id}
        projectName={data.name}
        trigger={
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
          >
            <Trash2Icon className="size-4" />
          </Button>
        }
      />
    </div>
  );
};

export const ProjectsList = ({ 
  onViewAll
}: ProjectsListProps) => {
  const projects = useProjectsPartial(6);

  if (projects === undefined) {
    return (
      <div className="flex items-center gap-3 rounded-[1.4rem] border border-panel-border bg-panel-elevated px-4 py-5 text-sm text-muted-foreground">
        <Spinner className="size-4 text-ring" />
        Loading your workspaces...
      </div>
    );
  }

  const [mostRecent, ...rest] = projects;

  if (projects.length === 0) {
    return (
      <div className="rounded-[1.4rem] border border-dashed border-panel-border bg-panel-elevated px-5 py-6">
        <div className="flex items-center gap-2 text-vscode-blue">
          <SparkleIcon className="size-4" />
          <span className="text-sm font-semibold">Fresh canvas</span>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          No projects yet. Start a fresh Torq-AI build or import an existing
          repository to get rolling.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {mostRecent ? <ContinueCard data={mostRecent} /> : null}
      {rest.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
              Recent projects
            </span>
            <button
              onClick={onViewAll}
              className="flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <span>View all</span>
              <Kbd className="border-panel-border bg-panel text-foreground">
                ⌘K
              </Kbd>
            </button>
          </div>
          <ul className="flex flex-col">
            {rest.map((project) => (
              <ProjectItem
                key={project._id}
                data={project}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
};
