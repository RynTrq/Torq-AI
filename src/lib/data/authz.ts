import "server-only";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const requireOwnedProject = async (projectId: string) => {
  const user = await requireUser();

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ownerId: user.id,
    },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  return {
    user,
    project,
  };
};

export const requireOwnedConversation = async (conversationId: string) => {
  const user = await requireUser();

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      project: true,
    },
  });

  if (!conversation || conversation.project.ownerId !== user.id) {
    throw new Error("Conversation not found");
  }

  return {
    user,
    conversation,
  };
};

export const requireOwnedFile = async (fileId: string) => {
  const user = await requireUser();

  const file = await prisma.projectFile.findUnique({
    where: { id: fileId },
    include: {
      project: true,
    },
  });

  if (!file || file.project.ownerId !== user.id) {
    throw new Error("File not found");
  }

  return {
    user,
    file,
  };
};
