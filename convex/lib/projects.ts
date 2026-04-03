import { Id } from "../_generated/dataModel";
import { MutationCtx } from "../_generated/server";

export const assertProjectDeletable = async (
  ctx: MutationCtx,
  projectId: Id<"projects">,
  ownerId: string,
) => {
  const project = await ctx.db.get(projectId);

  if (!project) {
    throw new Error("Project not found");
  }

  if (project.ownerId !== ownerId) {
    throw new Error("Unauthorized access to this project");
  }

  if (project.importStatus === "importing") {
    throw new Error(
      "Wait for the GitHub import to finish before deleting this project",
    );
  }

  if (project.exportStatus === "exporting") {
    throw new Error(
      "Wait for the GitHub export to finish before deleting this project",
    );
  }

  const processingMessages = await ctx.db
    .query("messages")
    .withIndex("by_project_status", (q) =>
      q.eq("projectId", projectId).eq("status", "processing"),
    )
    .collect();

  if (processingMessages.length > 0) {
    throw new Error("Cancel or finish the active AI run before deleting this project");
  }

  return project;
};

export const deleteProjectTree = async (
  ctx: MutationCtx,
  projectId: Id<"projects">,
) => {
  const files = await ctx.db
    .query("files")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();

  for (const file of files) {
    if (file.storageId) {
      await ctx.storage.delete(file.storageId);
    }
  }

  const conversations = await ctx.db
    .query("conversations")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();

  for (const conversation of conversations) {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversation._id))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }
  }

  for (const conversation of conversations) {
    await ctx.db.delete(conversation._id);
  }

  for (const file of files) {
    await ctx.db.delete(file._id);
  }

  await ctx.db.delete(projectId);

  return projectId;
};
