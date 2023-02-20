import { z } from "zod";
import { Channel, prisma, Server } from "@answeroverflow/prisma-types";
import { addFlagsToUserServerSettings, zDiscordAccountPublic } from "@answeroverflow/prisma-types";
import { Message, elastic, zMessage, MessageSearchOptions } from "@answeroverflow/elastic-types";
import { DBError } from "./utils/error";
import {
  findIgnoredDiscordAccountById,
  findManyIgnoredDiscordAccountsById,
} from "./ignored-discord-account";
import { findManyUserServerSettings, findUserServerSettingsById } from "./user-server-settings";
export type MessageWithDiscordAccount = z.infer<typeof zMessageWithDiscordAccount>;
export const zMessageWithDiscordAccount = zMessage
  .extend({
    author: zDiscordAccountPublic,
    public: z.boolean(),
  })
  .omit({ authorId: true });

export type MessageWithAccountAndRepliesTo = z.infer<typeof zMessageWithDiscordAccount> & {
  referencedMessage: MessageWithDiscordAccount | null;
};

export function isMessageWithAccountAndRepliesTo(
  message: MessageWithDiscordAccount | MessageWithAccountAndRepliesTo
): message is MessageWithAccountAndRepliesTo {
  return "referencedMessage" in message;
}

export const zMessageWithAccountAndRepliesTo: z.ZodType<MessageWithAccountAndRepliesTo> =
  zMessageWithDiscordAccount.extend({
    referencedMessage: z.lazy(() => zMessageWithDiscordAccount.nullable()),
  });

export const zFindMessagesByChannelId = z.object({
  channelId: z.string(),
  after: z.string().optional(),
  limit: z.number().optional(),
});

export async function addRepliesToMessages(messages: Message[]) {
  const replies = await elastic.bulkGetMessages(
    messages.flatMap((m) => m.messageReference?.messageId ?? [])
  );
  const repliesLookup = new Map(replies.map((r) => [r.id, r]));
  return messages.map((m) => ({
    ...m,
    referencedMessage: m.messageReference?.messageId
      ? repliesLookup.get(m.messageReference?.messageId)
      : null,
  }));
}

export type MessageWithReply = Awaited<ReturnType<typeof addRepliesToMessages>>[number];

export function isMessageWithReply(
  message: Message | MessageWithReply
): message is MessageWithReply {
  return "referencedMessage" in message;
}

async function idk({
  authorIds,
  authorServerIds,
}: {
  authorIds: string[];
  authorServerIds: string[];
}) {
  const authors = await prisma.discordAccount.findMany({
    where: {
      id: {
        in: authorIds,
      },
    },
    include: {
      userServerSettings: {
        where: {
          serverId: {
            in: authorServerIds,
          },
        },
      },
    },
  });
  const toAuthorServerSettingsLookupKey = (discordId: string, serverId: string) =>
    `${discordId}-${serverId}`;

  const authorServerSettingsLookup = new Map(
    authors.flatMap((a) =>
      a.userServerSettings.map((uss) => [
        toAuthorServerSettingsLookupKey(uss.userId, uss.serverId),
        addFlagsToUserServerSettings(uss),
      ])
    )
  );
  const authorLookup = new Map(authors.map((a) => [a.id, a]));

  const addAuthorToMessage = (m: Message): MessageWithDiscordAccount => ({
    ...m,
    author: zDiscordAccountPublic.parse(authorLookup.get(m.authorId)!),
    public:
      authorServerSettingsLookup.get(toAuthorServerSettingsLookupKey(m.authorId, m.serverId))?.flags
        .canPubliclyDisplayMessages ?? false,
  });
  return { authorLookup, addAuthorToMessage };
}

export async function addAuthorsToMessages<T extends Message>(messages: T[]) {
  if (messages.length === 0) {
    return [];
  }
  const authorIds = messages.map((m) => m.authorId);
  const authorServerIds = messages.map((m) => m.serverId);
  const { authorLookup, addAuthorToMessage } = await idk({ authorIds, authorServerIds });
  return messages.filter((m) => authorLookup.has(m.authorId)).map(addAuthorToMessage);
}

export async function addAuthorsToMessagesWithReplies<T extends MessageWithReply>(messages: T[]) {
  if (messages.length === 0) {
    return [];
  }
  const authorIds = messages
    .map((m) => (m.referencedMessage ? [m.authorId, m.referencedMessage.authorId] : [m.authorId]))
    .flat();
  const authorServerIds = messages
    .map((m) => (m.referencedMessage ? [m.serverId, m.referencedMessage.serverId] : [m.serverId]))
    .flat();
  const { authorLookup, addAuthorToMessage } = await idk({ authorIds, authorServerIds });
  return messages
    .filter((m) => authorLookup.has(m.authorId))
    .map((m) => ({
      ...addAuthorToMessage(m),
      referencedMessage: m.referencedMessage ? addAuthorToMessage(m.referencedMessage) : null,
    }));
}

export const CANNOT_UPSERT_MESSAGE_FOR_IGNORED_ACCOUNT_MESSAGE =
  "Message author is deleted, cannot upsert message";
export const CANNOT_UPSERT_MESSAGE_FOR_USER_WITH_MESSAGE_INDEXING_DISABLED_MESSAGE =
  "Message author has disabled message indexing, cannot upsert message";

export async function findMessageById(id: string) {
  const msg = await elastic.getMessage(id);
  if (!msg) {
    return null;
  }
  const msgWithReplies = await addRepliesToMessages([msg]);
  const msgWithAuthorAndReplies = await addAuthorsToMessagesWithReplies(msgWithReplies);
  return msgWithAuthorAndReplies[0] ?? null;
}

export async function findMessagesByChannelId(input: z.infer<typeof zFindMessagesByChannelId>) {
  const messages = await elastic.bulkGetMessagesByChannelId(
    input.channelId,
    input.after,
    input.limit
  );
  if (messages.length === 0) {
    return [];
  }
  const withReplies = await addRepliesToMessages(messages);
  return addAuthorsToMessagesWithReplies(withReplies);
}

export async function findManyMessages(ids: string[]) {
  const allMessages = await elastic.bulkGetMessages(ids);
  const withReplies = await addRepliesToMessages(allMessages);
  return addAuthorsToMessagesWithReplies(withReplies);
}

export async function updateMessage(data: z.infer<typeof zMessage>) {
  return elastic.updateMessage(data);
}

export async function upsertMessage(data: z.infer<typeof zMessage>) {
  const [ignoredAccount, userServerSettings] = await Promise.all([
    findIgnoredDiscordAccountById(data.authorId),
    findUserServerSettingsById({
      userId: data.authorId,
      serverId: data.serverId,
    }),
  ]);
  if (ignoredAccount) {
    throw new DBError(CANNOT_UPSERT_MESSAGE_FOR_IGNORED_ACCOUNT_MESSAGE, "IGNORED_ACCOUNT");
  }
  if (userServerSettings?.flags.messageIndexingDisabled) {
    throw new DBError(
      CANNOT_UPSERT_MESSAGE_FOR_USER_WITH_MESSAGE_INDEXING_DISABLED_MESSAGE,
      "MESSAGE_INDEXING_DISABLED"
    );
  }
  return await elastic.upsertMessage(data);
}

export async function upsertManyMessages(data: z.infer<typeof zMessage>[]) {
  const authorIds = new Set(data.map((msg) => msg.authorId));
  const [ignoredAccounts, userServerSettings] = await Promise.all([
    await findManyIgnoredDiscordAccountsById(Array.from(authorIds)),
    await findManyUserServerSettings(
      data.map((msg) => ({
        userId: msg.authorId,
        serverId: msg.serverId,
      }))
    ),
  ]);
  const userServerSettingsLookup = new Map(
    userServerSettings.map((uss) => [`${uss.userId}-${uss.serverId}`, uss])
  );

  const ignoredAccountIds = new Set(ignoredAccounts.map((i) => i.id));
  const filteredMessages = data.filter(
    (msg) =>
      !ignoredAccountIds.has(msg.authorId) &&
      !userServerSettingsLookup.get(`${msg.authorId}-${msg.serverId}`)?.flags
        .messageIndexingDisabled
  );
  return elastic.bulkUpsertMessages(filteredMessages);
}

export async function deleteMessage(id: string) {
  return elastic.deleteMessage(id);
}

export async function deleteManyMessages(ids: string[]) {
  return elastic.bulkDeleteMessages(ids);
}

export async function deleteManyMessagesByChannelId(channelId: string) {
  return elastic.deleteByChannelId(channelId);
}

export async function deleteManyMessagesByUserId(userId: string) {
  return elastic.deleteByUserId(userId);
}

export type SearchResult = {
  question: MessageWithDiscordAccount;
  answer: MessageWithDiscordAccount;
  score: number;
  channel: Channel;
  server: Server;
  thread?: Channel;
};

export async function searchMessages(options: MessageSearchOptions): Promise<SearchResult[]> {
  const searchResults = await elastic.searchMessages(options);
  const messages = searchResults.map((r) => r._source);
  const withDiscordAccounts = await addAuthorsToMessages(messages);
}
