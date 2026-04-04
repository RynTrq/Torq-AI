import ky from "ky";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ProjectFileRecord } from "@/lib/data/types";

import { Doc, Id } from "@/lib/data/app-types";

// Sort: folders first, then files, alphabetically within each group
const sortFiles = <T extends { type: "file" | "folder"; name: string }>(
  files: T[]
): T[] => {
  return [...files].sort((a, b) => {
    if (a.type === "folder" && b.type === "file") return -1;
    if (a.type === "file" && b.type === "folder") return 1;
    return a.name.localeCompare(b.name);
  });
};

export const useFiles = (projectId: Id<"projects"> | null) => {
  const query = useQuery({
    queryKey: ["project-files", projectId],
    queryFn: async () => {
      if (!projectId) {
        return [];
      }

      const files = await ky
        .get(`/api/projects/${projectId}/files`)
        .json<ProjectFileRecord[]>();

      return files as Doc<"files">[];
    },
    enabled: Boolean(projectId),
  });

  return projectId ? query.data : undefined;
};

export const useFile = (fileId: Id<"files"> | null) => {
  const query = useQuery({
    queryKey: ["file", fileId],
    queryFn: async () => {
      if (!fileId) {
        return null;
      }

      const file = await ky
        .get(`/api/files/${fileId}`)
        .json<ProjectFileRecord | null>();

      return file as Doc<"files"> | null;
    },
    enabled: Boolean(fileId),
  });

  return fileId ? query.data : undefined;
};

export const useFilePath = (fileId: Id<"files"> | null) => {
  const query = useQuery({
    queryKey: ["file-path", fileId],
    queryFn: async () => {
      if (!fileId) {
        return [];
      }

      return ky
        .get(`/api/files/${fileId}/path`)
        .json<Array<{ _id: Id<"files">; name: string }>>();
    },
    enabled: Boolean(fileId),
  });

  return fileId ? query.data : undefined;
};

export const useUpdateFile = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      id,
      content,
    }: {
      id: Id<"files">;
      content: string;
    }) => {
      const file = await ky
        .patch(`/api/files/${id}`, {
          json: { content },
        })
        .json<ProjectFileRecord>();

      return file as Doc<"files">;
    },
    onSuccess: (file) => {
      queryClient.setQueryData(["file", file._id], file);
      void queryClient.invalidateQueries({
        queryKey: ["project-files", file.projectId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["folder-contents", file.projectId],
      });
    },
  });

  return mutation.mutateAsync;
};
 
export const useCreateFile = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      projectId,
      parentId,
      name,
      content,
    }: {
      projectId: Id<"projects">;
      parentId?: Id<"files">;
      name: string;
      content: string;
    }) => {
      const file = await ky
        .post(`/api/projects/${projectId}/files`, {
          json: {
            type: "file",
            parentId,
            name,
            content,
          },
        })
        .json<ProjectFileRecord>();

      return file as Doc<"files">;
    },
    onSuccess: (file) => {
      queryClient.setQueryData(["file", file._id], file);
      void queryClient.invalidateQueries({
        queryKey: ["project-files", file.projectId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["folder-contents", file.projectId],
      });
    },
  });

  return mutation.mutateAsync;
};

export const useCreateFolder = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      projectId,
      parentId,
      name,
    }: {
      projectId: Id<"projects">;
      parentId?: Id<"files">;
      name: string;
    }) => {
      const folder = await ky
        .post(`/api/projects/${projectId}/files`, {
          json: {
            type: "folder",
            parentId,
            name,
          },
        })
        .json<ProjectFileRecord>();

      return folder as Doc<"files">;
    },
    onSuccess: (folder) => {
      queryClient.setQueryData(["file", folder._id], folder);
      void queryClient.invalidateQueries({
        queryKey: ["project-files", folder.projectId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["folder-contents", folder.projectId],
      });
    },
  });

  return mutation.mutateAsync;
};

export const useRenameFile = ({
  projectId,
  parentId,
}: {
  projectId: Id<"projects">;
  parentId?: Id<"files">;
}) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      id,
      newName,
    }: {
      id: Id<"files">;
      newName: string;
    }) => {
      const file = await ky
        .patch(`/api/files/${id}`, {
          json: { newName },
        })
        .json<ProjectFileRecord>();

      return file as Doc<"files">;
    },
    onSuccess: (file) => {
      queryClient.setQueryData(["file", file._id], file);
      void queryClient.invalidateQueries({
        queryKey: ["project-files", file.projectId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["folder-contents", projectId, parentId ?? null],
      });
      void queryClient.invalidateQueries({
        queryKey: ["folder-contents", file.projectId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["file-path", file._id],
      });
    },
  });

  return mutation.mutateAsync;
};

export const useDeleteFile = ({
  projectId,
  parentId,
}: {
  projectId: Id<"projects">;
  parentId?: Id<"files">;
}) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id }: { id: Id<"files"> }) => {
      await ky.delete(`/api/files/${id}`);
      return id;
    },
    onSuccess: (fileId) => {
      queryClient.removeQueries({ queryKey: ["file", fileId] });
      queryClient.removeQueries({ queryKey: ["file-path", fileId] });
      void queryClient.invalidateQueries({
        queryKey: ["project-files", projectId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["folder-contents", projectId, parentId ?? null],
      });
      void queryClient.invalidateQueries({
        queryKey: ["folder-contents", projectId],
      });
    },
  });

  return mutation.mutateAsync;
};

export const useFolderContents = ({
  projectId,
  parentId,
  enabled = true,
}: {
  projectId: Id<"projects">;
  parentId?: Id<"files">;
  enabled?: boolean;
}) => {
  const query = useQuery({
    queryKey: ["folder-contents", projectId, parentId ?? null],
    queryFn: async () => {
      const files = await ky
        .get(`/api/projects/${projectId}/folder-contents`, {
          searchParams: parentId ? { parentId } : undefined,
        })
        .json<ProjectFileRecord[]>();

      return sortFiles(files as Doc<"files">[]);
    },
    enabled,
  });

  return enabled ? query.data : undefined;
};
