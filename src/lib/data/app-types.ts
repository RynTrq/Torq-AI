import type {
  ConversationRecord,
  EntityId,
  MessageRecord,
  ProjectFileRecord,
  ProjectRecord,
} from "@/lib/data/types";

type AppDocMap = {
  projects: ProjectRecord;
  files: ProjectFileRecord;
  conversations: ConversationRecord;
  messages: MessageRecord;
};

export type AppTableName = keyof AppDocMap;

export type Id<TableName extends string> =
  | EntityId
  | (EntityId & {
      readonly __tableName?: TableName;
    });

export type Doc<TableName extends AppTableName> = AppDocMap[TableName];
