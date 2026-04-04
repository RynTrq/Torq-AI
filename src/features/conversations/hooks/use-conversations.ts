import ky from "ky";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  ConversationRecord,
  MessageRecord,
} from "@/lib/data/types";

import { Doc, Id } from "@/lib/data/app-types";

export const useConversation = (id: Id<"conversations"> | null) => {
  const query = useQuery({
    queryKey: ["conversation", id],
    queryFn: async () => {
      if (!id) {
        return null;
      }

      const conversation = await ky
        .get(`/api/conversations/${id}`)
        .json<ConversationRecord | null>();

      return conversation as Doc<"conversations"> | null;
    },
    enabled: Boolean(id),
  });

  return id ? query.data : undefined;
};

export const useMessages = (conversationId: Id<"conversations"> | null) => {
  const query = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId) {
        return [];
      }

      const messages = await ky
        .get(`/api/conversations/${conversationId}/messages`)
        .json<MessageRecord[]>();

      return messages as Doc<"messages">[];
    },
    enabled: Boolean(conversationId),
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      const messages = query.state.data as Doc<"messages">[] | undefined;
      const isProcessing = messages?.some(
        (message) => message.status === "processing",
      );

      return isProcessing ? 1500 : false;
    },
  });

  return conversationId ? query.data : undefined;
};

export const useConversations = (projectId: Id<"projects">) => {
  const query = useQuery({
    queryKey: ["conversations", projectId],
    queryFn: async () => {
      const conversations = await ky
        .get(`/api/projects/${projectId}/conversations`)
        .json<ConversationRecord[]>();

      return conversations as Doc<"conversations">[];
    },
  });

  return query.data;
};

export const useCreateConversation = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      projectId,
      title,
    }: {
      projectId: Id<"projects">;
      title: string;
    }) => {
      const conversation = await ky
        .post(`/api/projects/${projectId}/conversations`, {
          json: { title },
        })
        .json<ConversationRecord>();

      return conversation as Doc<"conversations">;
    },
    onSuccess: (conversation) => {
      queryClient.setQueryData(["conversation", conversation._id], conversation);
      void queryClient.invalidateQueries({
        queryKey: ["conversations", conversation.projectId],
      });
    },
  });

  return async ({
    projectId,
    title,
  }: {
    projectId: Id<"projects">;
    title: string;
  }) => {
    const conversation = await mutation.mutateAsync({ projectId, title });
    return conversation._id;
  };
};
