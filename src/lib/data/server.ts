import "server-only";

import {
  FileKind,
  MessageRole as PrismaMessageRole,
  MessageStatus as PrismaMessageStatus,
  Prisma,
  ProjectExportStatus as PrismaProjectExportStatus,
  ProjectImportStatus as PrismaProjectImportStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type {
  ConversationRecord,
  MessageRecord,
  ProjectFileRecord,
  ProjectRecord,
  ProjectSettings,
} from "@/lib/data/types";
import { normalizeProjectPathSegment } from "@/lib/project-file-paths";

const serializeProject = (project: {
  id: string;
  createdAt: Date;
  name: string;
  ownerId: string;
  updatedAt: Date;
  importStatus: string | null;
  importError: string | null;
  exportStatus: string | null;
  exportRepoUrl: string | null;
  exportError: string | null;
  settings: Prisma.JsonValue | null;
}): ProjectRecord => ({
  _id: project.id,
  _creationTime: project.createdAt.getTime(),
  name: project.name,
  ownerId: project.ownerId,
  updatedAt: project.updatedAt.getTime(),
  importStatus:
    project.importStatus?.toLowerCase() as ProjectRecord["importStatus"],
  importError: project.importError ?? undefined,
  exportStatus:
    project.exportStatus?.toLowerCase() as ProjectRecord["exportStatus"],
  exportRepoUrl: project.exportRepoUrl ?? undefined,
  exportError: project.exportError ?? undefined,
  settings: (project.settings as ProjectSettings | null) ?? undefined,
});

const serializeFile = (
  file: {
  id: string;
  createdAt: Date;
  projectId: string;
  parentId: string | null;
  name: string;
  kind: FileKind;
  content: string | null;
  storagePath: string | null;
  mimeType: string | null;
  updatedAt: Date;
  },
  options?: { includeContent?: boolean },
): ProjectFileRecord => ({
  _id: file.id,
  _creationTime: file.createdAt.getTime(),
  projectId: file.projectId,
  parentId: file.parentId ?? undefined,
  name: file.name,
  type: file.kind === "FOLDER" ? "folder" : "file",
  content: options?.includeContent ? file.content ?? undefined : undefined,
  storageId: file.storagePath ?? undefined,
  storagePath: file.storagePath ?? undefined,
  storageUrl: file.storagePath ?? null,
  mimeType: file.mimeType ?? undefined,
  updatedAt: file.updatedAt.getTime(),
});

const serializeConversation = (conversation: {
  id: string;
  createdAt: Date;
  projectId: string;
  title: string;
  updatedAt: Date;
}): ConversationRecord => ({
  _id: conversation.id,
  _creationTime: conversation.createdAt.getTime(),
  projectId: conversation.projectId,
  title: conversation.title,
  updatedAt: conversation.updatedAt.getTime(),
});

const serializeMessage = (message: {
  id: string;
  createdAt: Date;
  conversationId: string;
  projectId: string;
  role: PrismaMessageRole;
  content: string;
  status: PrismaMessageStatus | null;
  modelId: string | null;
  errorMessage: string | null;
  updatedAt: Date;
}): MessageRecord => ({
  _id: message.id,
  _creationTime: message.createdAt.getTime(),
  conversationId: message.conversationId,
  projectId: message.projectId,
  role: message.role === "ASSISTANT" ? "assistant" : "user",
  content: message.content,
  status: message.status?.toLowerCase() as MessageRecord["status"],
  modelId: message.modelId ?? undefined,
  errorMessage: message.errorMessage ?? undefined,
  updatedAt: message.updatedAt.getTime(),
});

const touchProject = async (projectId: string) => {
  await prisma.project.update({
    where: { id: projectId },
    data: { updatedAt: new Date() },
  });
};

export const getUserGithubAccessToken = async (userId: string) => {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: "github",
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return account?.access_token ?? null;
};

export const createUserWithPassword = async ({
  email,
  name,
  passwordHash,
}: {
  email: string;
  name?: string;
  passwordHash: string;
}) => {
  return prisma.user.create({
    data: {
      email: email.toLowerCase(),
      name,
      passwordHash,
    },
  });
};

export const getProjects = async (ownerId: string) => {
  const projects = await prisma.project.findMany({
    where: { ownerId },
    orderBy: { updatedAt: "desc" },
  });

  return projects.map(serializeProject);
};

export const getProjectsPartial = async (ownerId: string, limit: number) => {
  const projects = await prisma.project.findMany({
    where: { ownerId },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  return projects.map(serializeProject);
};

export const getProjectById = async (ownerId: string, id: string) => {
  const project = await prisma.project.findFirst({
    where: {
      id,
      ownerId,
    },
  });

  return project ? serializeProject(project) : null;
};

export const createProject = async (ownerId: string, name: string) => {
  const project = await prisma.project.create({
    data: {
      ownerId,
      name,
    },
  });

  return serializeProject(project);
};

export const createProjectWithConversation = async ({
  ownerId,
  projectName,
  conversationTitle,
}: {
  ownerId: string;
  projectName: string;
  conversationTitle: string;
}) => {
  const result = await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        ownerId,
        name: projectName,
      },
    });

    const conversation = await tx.conversation.create({
      data: {
        projectId: project.id,
        title: conversationTitle,
      },
    });

    return { project, conversation };
  });

  return {
    projectId: result.project.id,
    conversationId: result.conversation.id,
  };
};

export const renameProject = async ({
  ownerId,
  id,
  name,
}: {
  ownerId: string;
  id: string;
  name: string;
}) => {
  const project = await prisma.project.findFirst({
    where: { id, ownerId },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  const updated = await prisma.project.update({
    where: { id },
    data: {
      name,
      updatedAt: new Date(),
    },
  });

  return serializeProject(updated);
};

export const updateProjectSettings = async ({
  ownerId,
  id,
  settings,
}: {
  ownerId: string;
  id: string;
  settings: ProjectSettings;
}) => {
  const project = await prisma.project.findFirst({
    where: { id, ownerId },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  const updated = await prisma.project.update({
    where: { id },
    data: {
      settings: settings as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });

  return serializeProject(updated);
};

export const updateProjectImportStatus = async ({
  projectId,
  status,
  error,
}: {
  projectId: string;
  status?: "importing" | "completed" | "failed";
  error?: string;
}) => {
  const updated = await prisma.project.update({
    where: { id: projectId },
    data: {
      importStatus: status?.toUpperCase() as PrismaProjectImportStatus | undefined,
      importError: error,
      updatedAt: new Date(),
    },
  });

  return serializeProject(updated);
};

export const updateProjectExportStatus = async ({
  projectId,
  status,
  error,
  repoUrl,
}: {
  projectId: string;
  status?: "exporting" | "completed" | "failed" | "cancelled";
  error?: string;
  repoUrl?: string;
}) => {
  const updated = await prisma.project.update({
    where: { id: projectId },
    data: {
      exportStatus: status?.toUpperCase() as PrismaProjectExportStatus | undefined,
      exportError: error,
      exportRepoUrl: repoUrl,
      updatedAt: new Date(),
    },
  });

  return serializeProject(updated);
};

export const listProjectFiles = async (
  projectId: string,
  options?: { includeContent?: boolean },
) => {
  const files = await prisma.projectFile.findMany({
    where: { projectId },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });

  return files.map((file) => serializeFile(file, options));
};

export const getFileById = async (
  fileId: string,
  options?: { includeContent?: boolean },
) => {
  const file = await prisma.projectFile.findUnique({
    where: { id: fileId },
  });

  return file ? serializeFile(file, { includeContent: options?.includeContent ?? true }) : null;
};

export const getFilesByIds = async (
  fileIds: string[],
  options?: { includeContent?: boolean },
) => {
  if (fileIds.length === 0) {
    return [];
  }

  const files = await prisma.projectFile.findMany({
    where: {
      id: {
        in: fileIds,
      },
    },
  });

  const byId = new Map(
    files.map((file) => [
      file.id,
      serializeFile(file, { includeContent: options?.includeContent ?? true }),
    ]),
  );

  return fileIds.flatMap((fileId) => {
    const file = byId.get(fileId);
    return file ? [file] : [];
  });
};

export const getFolderContents = async ({
  projectId,
  parentId,
  includeContent,
}: {
  projectId: string;
  parentId?: string;
  includeContent?: boolean;
}) => {
  const files = await prisma.projectFile.findMany({
    where: {
      projectId,
      parentId: parentId ?? null,
    },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });

  return files.map((file) => serializeFile(file, { includeContent }));
};

export const getFilePath = async (fileId: string) => {
  const path: { _id: string; name: string }[] = [];
  let currentId: string | null = fileId;

  while (currentId) {
    const file: { id: string; name: string; parentId: string | null } | null =
      await prisma.projectFile.findUnique({
      where: { id: currentId },
      select: { id: true, name: true, parentId: true },
      });

    if (!file) {
      break;
    }

    path.unshift({ _id: file.id, name: file.name });
    currentId = file.parentId;
  }

  return path;
};

const ensureProjectFileNameAvailable = async ({
  projectId,
  parentId,
  name,
  excludeId,
}: {
  projectId: string;
  parentId?: string;
  name: string;
  excludeId?: string;
}) => {
  const sibling = await prisma.projectFile.findFirst({
    where: {
      projectId,
      parentId: parentId ?? null,
      name,
      ...(excludeId
        ? {
            NOT: { id: excludeId },
          }
        : {}),
    },
  });

  if (sibling) {
    throw new Error("Project item already exists in this location");
  }
};

const resolveParentFolder = async ({
  projectId,
  parentId,
}: {
  projectId: string;
  parentId?: string;
}) => {
  if (!parentId) {
    return undefined;
  }

  const parent = await prisma.projectFile.findUnique({
    where: { id: parentId },
    select: { id: true, kind: true, projectId: true },
  });

  if (!parent || parent.projectId !== projectId) {
    throw new Error("Parent folder not found");
  }

  if (parent.kind !== "FOLDER") {
    throw new Error("Parent item must be a folder");
  }

  return parent.id;
};

export const createFile = async ({
  projectId,
  parentId,
  name,
  content,
}: {
  projectId: string;
  parentId?: string;
  name: string;
  content: string;
}) => {
  const normalizedName = normalizeProjectPathSegment(name);
  const resolvedParentId = await resolveParentFolder({ projectId, parentId });

  await ensureProjectFileNameAvailable({
    projectId,
    parentId: resolvedParentId,
    name: normalizedName,
  });

  const file = await prisma.projectFile.create({
    data: {
      projectId,
      parentId: resolvedParentId ?? null,
      name: normalizedName,
      kind: "FILE",
      content,
    },
  });

  await touchProject(projectId);

  return serializeFile(file);
};

export const createFiles = async ({
  projectId,
  parentId,
  files,
}: {
  projectId: string;
  parentId?: string;
  files: Array<{ name: string; content: string }>;
}) => {
  const results: Array<{ name: string; fileId: string; error?: string }> = [];

  for (const file of files) {
    try {
      const created = await createFile({
        projectId,
        parentId,
        name: file.name,
        content: file.content,
      });

      results.push({
        name: file.name,
        fileId: created._id,
      });
    } catch (error) {
      results.push({
        name: file.name,
        fileId: "",
        error: error instanceof Error ? error.message : "Unable to create file",
      });
    }
  }

  return results;
};

export const createFolder = async ({
  projectId,
  parentId,
  name,
}: {
  projectId: string;
  parentId?: string;
  name: string;
}) => {
  const normalizedName = normalizeProjectPathSegment(name);
  const resolvedParentId = await resolveParentFolder({ projectId, parentId });

  await ensureProjectFileNameAvailable({
    projectId,
    parentId: resolvedParentId,
    name: normalizedName,
  });

  const folder = await prisma.projectFile.create({
    data: {
      projectId,
      parentId: resolvedParentId ?? null,
      name: normalizedName,
      kind: "FOLDER",
    },
  });

  await touchProject(projectId);

  return serializeFile(folder);
};

export const createBinaryFile = async ({
  projectId,
  parentId,
  name,
  dataUrl,
  mimeType,
}: {
  projectId: string;
  parentId?: string;
  name: string;
  dataUrl: string;
  mimeType?: string;
}) => {
  const normalizedName = normalizeProjectPathSegment(name);
  const resolvedParentId = await resolveParentFolder({ projectId, parentId });

  await ensureProjectFileNameAvailable({
    projectId,
    parentId: resolvedParentId,
    name: normalizedName,
  });

  const file = await prisma.projectFile.create({
    data: {
      projectId,
      parentId: resolvedParentId ?? null,
      name: normalizedName,
      kind: "FILE",
      storagePath: dataUrl,
      mimeType,
    },
  });

  await touchProject(projectId);

  return serializeFile(file);
};

export const updateFileContent = async ({
  fileId,
  content,
}: {
  fileId: string;
  content: string;
}) => {
  const existing = await prisma.projectFile.findUnique({
    where: { id: fileId },
  });

  if (!existing) {
    throw new Error("File not found");
  }

  if (existing.kind !== "FILE") {
    throw new Error("Folders cannot be edited as files");
  }

  if (existing.storagePath) {
    throw new Error("Binary files cannot be edited as text");
  }

  const file = await prisma.projectFile.update({
    where: { id: fileId },
    data: {
      content,
    },
  });

  await touchProject(existing.projectId);

  return serializeFile(file);
};

export const renameFile = async ({
  fileId,
  newName,
}: {
  fileId: string;
  newName: string;
}) => {
  const existing = await prisma.projectFile.findUnique({
    where: { id: fileId },
  });

  if (!existing) {
    throw new Error("File not found");
  }

  const normalizedName = normalizeProjectPathSegment(newName);

  await ensureProjectFileNameAvailable({
    projectId: existing.projectId,
    parentId: existing.parentId ?? undefined,
    name: normalizedName,
    excludeId: existing.id,
  });

  const file = await prisma.projectFile.update({
    where: { id: fileId },
    data: {
      name: normalizedName,
    },
  });

  await touchProject(existing.projectId);

  return serializeFile(file);
};

export const deleteFile = async (fileId: string) => {
  const existing = await prisma.projectFile.findUnique({
    where: { id: fileId },
  });

  if (!existing) {
    throw new Error("File not found");
  }

  await prisma.projectFile.delete({
    where: { id: fileId },
  });

  await touchProject(existing.projectId);
};

export const getConversationById = async (conversationId: string) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  return conversation ? serializeConversation(conversation) : null;
};

export const createConversation = async ({
  projectId,
  title,
}: {
  projectId: string;
  title: string;
}) => {
  const conversation = await prisma.conversation.create({
    data: {
      projectId,
      title,
    },
  });

  return serializeConversation(conversation);
};

export const listConversationsByProject = async (projectId: string) => {
  const conversations = await prisma.conversation.findMany({
    where: { projectId },
    orderBy: { updatedAt: "desc" },
  });

  return conversations.map(serializeConversation);
};

export const listMessages = async (conversationId: string) => {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });

  return messages.map(serializeMessage);
};

export const listRecentMessages = async ({
  conversationId,
  limit = 10,
}: {
  conversationId: string;
  limit?: number;
}) => {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return messages.reverse().map(serializeMessage);
};

export const listProcessingMessagesForConversation = async (
  conversationId: string,
) => {
  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      status: "PROCESSING",
    },
    orderBy: { createdAt: "asc" },
  });

  return messages.map(serializeMessage);
};

const STALE_MESSAGE_TIMEOUT_MS = 90_000;

const buildStaleProcessingContent = () =>
  [
    "This request did not finish within the expected worker window.",
    "",
    "Torq-AI saved your prompt, but the background AI job never reported a final result.",
    "Retry the prompt. If this keeps happening, check the hosted Inngest function/webhook logs for this deployment.",
  ].join("\n");

export const resolveStaleProcessingMessagesForConversation = async (
  conversationId: string,
) => {
  const staleBefore = new Date(Date.now() - STALE_MESSAGE_TIMEOUT_MS);

  const staleMessages = await prisma.message.findMany({
    where: {
      conversationId,
      status: "PROCESSING",
      createdAt: {
        lte: staleBefore,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (staleMessages.length === 0) {
    return [];
  }

  console.warn("[torq-ai][messages] resolving-stale-processing-messages", {
    conversationId,
    count: staleMessages.length,
    messageIds: staleMessages.map((message) => message.id),
    modelIds: staleMessages.map((message) => message.modelId ?? null),
  });

  const staleContent = buildStaleProcessingContent();

  const updatedMessages = await Promise.all(
    staleMessages.map(async (message) => {
      const updated = await prisma.message.update({
        where: { id: message.id },
        data: {
          content: staleContent,
          errorMessage:
            "Background AI job timed out before a final response was recorded.",
          status: "COMPLETED",
        },
      });

      return serializeMessage(updated);
    }),
  );

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return updatedMessages;
};

export const createMessage = async ({
  conversationId,
  projectId,
  role,
  content,
  status,
  modelId,
  errorMessage,
}: {
  conversationId: string;
  projectId: string;
  role: "user" | "assistant";
  content: string;
  status?: "processing" | "completed" | "cancelled";
  modelId?: string;
  errorMessage?: string;
}) => {
  const message = await prisma.message.create({
    data: {
      conversationId,
      projectId,
      role: role === "assistant" ? "ASSISTANT" : "USER",
      content,
      status: status?.toUpperCase() as PrismaMessageStatus | undefined,
      modelId,
      errorMessage,
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return serializeMessage(message);
};

export const updateMessageContent = async ({
  messageId,
  content,
  modelId,
  errorMessage,
}: {
  messageId: string;
  content: string;
  modelId?: string;
  errorMessage?: string;
}) => {
  const message = await prisma.message.update({
    where: { id: messageId },
    data: {
      content,
      modelId,
      errorMessage,
      status: "COMPLETED",
    },
  });

  await prisma.conversation.update({
    where: { id: message.conversationId },
    data: { updatedAt: new Date() },
  });

  return serializeMessage(message);
};

export const updateMessageStatus = async ({
  messageId,
  status,
}: {
  messageId: string;
  status: "processing" | "completed" | "cancelled";
}) => {
  const message = await prisma.message.update({
    where: { id: messageId },
    data: {
      status: status.toUpperCase() as PrismaMessageStatus,
    },
  });

  return serializeMessage(message);
};

export const getMessageById = async (messageId: string) => {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  return message ? serializeMessage(message) : null;
};

export const listProcessingMessages = async (projectId: string) => {
  const messages = await prisma.message.findMany({
    where: {
      projectId,
      status: "PROCESSING",
    },
    orderBy: { createdAt: "asc" },
  });

  return messages.map(serializeMessage);
};

export const updateConversationTitle = async ({
  conversationId,
  title,
}: {
  conversationId: string;
  title: string;
}) => {
  const conversation = await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      title,
      updatedAt: new Date(),
    },
  });

  return serializeConversation(conversation);
};

export const deleteProject = async ({
  ownerId,
  projectId,
}: {
  ownerId: string;
  projectId: string;
}) => {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ownerId,
    },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  await prisma.project.delete({
    where: { id: projectId },
  });
};

export const clearProjectFiles = async (projectId: string) => {
  await prisma.projectFile.deleteMany({
    where: { projectId },
  });

  await touchProject(projectId);
};
