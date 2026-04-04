import ky from "ky";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ProjectRecord, ProjectSettings } from "@/lib/data/types";

import { Doc, Id } from "@/lib/data/app-types";

const projectKeys = {
  all: ["projects"] as const,
  partial: (limit: number) => ["projects", "partial", limit] as const,
  detail: (projectId: string) => ["projects", projectId] as const,
};

const castProject = (project: ProjectRecord | null): Doc<"projects"> | null =>
  project as Doc<"projects"> | null;

const castProjects = (projects: ProjectRecord[]): Doc<"projects">[] =>
  projects as Doc<"projects">[];

export const useProject = (projectId: Id<"projects">) => {
  const query = useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: async () => {
      const project = await ky
        .get(`/api/projects/${projectId}`)
        .json<ProjectRecord | null>();

      return castProject(project);
    },
  });

  return query.data;
};

export const useProjects = () => {
  const query = useQuery({
    queryKey: projectKeys.all,
    queryFn: async () => {
      const projects = await ky.get("/api/projects").json<ProjectRecord[]>();
      return castProjects(projects);
    },
  });

  return query.data;
};

export const useProjectsPartial = (limit: number) => {
  const query = useQuery({
    queryKey: projectKeys.partial(limit),
    queryFn: async () => {
      const projects = await ky
        .get("/api/projects", { searchParams: { limit: String(limit) } })
        .json<ProjectRecord[]>();

      return castProjects(projects);
    },
  });

  return query.data;
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const project = await ky
        .post("/api/projects", {
          json: { name },
        })
        .json<ProjectRecord>();

      return castProject(project);
    },
    onSuccess: (project) => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["projects", "partial"] });
      queryClient.setQueryData(projectKeys.detail(project!._id), project);
    },
  });

  return mutation.mutateAsync;
};

export const useRenameProject = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      id,
      name,
    }: {
      id: Id<"projects">;
      name: string;
    }) => {
      const project = await ky
        .patch(`/api/projects/${id}`, {
          json: { name },
        })
        .json<ProjectRecord>();

      return castProject(project);
    },
    onSuccess: (project) => {
      if (!project) {
        return;
      }

      queryClient.setQueryData(projectKeys.detail(project._id), project);
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["projects", "partial"] });
    },
  });

  return mutation.mutateAsync;
};

export const useUpdateProjectSettings = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      id,
      settings,
    }: {
      id: Id<"projects">;
      settings: ProjectSettings;
    }) => {
      const project = await ky
        .patch(`/api/projects/${id}`, {
          json: { settings },
        })
        .json<ProjectRecord>();

      return castProject(project);
    },
    onSuccess: (project) => {
      if (!project) {
        return;
      }

      queryClient.setQueryData(projectKeys.detail(project._id), project);
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["projects", "partial"] });
    },
  });

  return mutation.mutateAsync;
};
