export type EntityId = string;

export type ProjectImportStatus = "importing" | "completed" | "failed";
export type ProjectExportStatus =
  | "exporting"
  | "completed"
  | "failed"
  | "cancelled";
export type FileType = "file" | "folder";
export type MessageRole = "user" | "assistant";
export type MessageStatus = "processing" | "completed" | "cancelled";

export interface ProjectSettings {
  installCommand?: string;
  devCommand?: string;
  runCommand?: string;
}

export interface ProjectRecord {
  _id: EntityId;
  _creationTime: number;
  name: string;
  ownerId: string;
  updatedAt: number;
  importStatus?: ProjectImportStatus;
  importError?: string;
  exportStatus?: ProjectExportStatus;
  exportRepoUrl?: string;
  exportError?: string;
  settings?: ProjectSettings;
}

export interface ProjectFileRecord {
  _id: EntityId;
  _creationTime: number;
  projectId: EntityId;
  parentId?: EntityId;
  name: string;
  type: FileType;
  content?: string;
  storageId?: string;
  storagePath?: string;
  storageUrl: string | null;
  mimeType?: string;
  updatedAt: number;
}

export interface ConversationRecord {
  _id: EntityId;
  _creationTime: number;
  projectId: EntityId;
  title: string;
  updatedAt: number;
}

export interface MessageRecord {
  _id: EntityId;
  _creationTime: number;
  conversationId: EntityId;
  projectId: EntityId;
  role: MessageRole;
  content: string;
  status?: MessageStatus;
  modelId?: string;
  errorMessage?: string;
  updatedAt: number;
}
