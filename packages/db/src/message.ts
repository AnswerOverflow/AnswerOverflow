import { z } from "zod";
import { prisma } from "@answeroverflow/prisma-types";
import {
  zMessage,
  addFlagsToUserServerSettings,
  zDiscordAccountPublic,
} from "@answeroverflow/prisma-types";
import { Message, elastic } from "@answeroverflow/elastic-types";
import { DBError } from "./utils/error";
import {
  findIgnoredDiscordAccountById,
  findManyIgnoredDiscordAccountsById,
} from "./ignored-discord-account";
export type MessageWithDiscordAccount = z.infer<typeof zMessageWithDiscordAccount>;
export const zMessageWithDiscordAccount = zMessage
  .extend({
    author: zDiscordAccountPublic,
    public: z.boolean().default(false),
  })
  .omit({ authorId: true });

export const zFindMessagesByChannelId = z.object({
  channelId: z.string(),
  after: z.string().optional(),
  limit: z.number().optional(),
});

export async function addAuthorsToMessages(messages: Message[]) {
  const authors = await prisma.discordAccount.findMany({
    where: {
      id: {
        in: messages.map((m) => m.authorId),
      },
    },
    include: {
      userServerSettings: {
        where: {
          serverId: {
            in: messages.map((m) => m.serverId),
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

  return messages
    .filter((m) => authorLookup.has(m.authorId))
    .map(
      (m): z.infer<typeof zMessageWithDiscordAccount> => ({
        ...m,
        author: {
          ...zDiscordAccountPublic.parse(authorLookup.get(m.authorId)!),
        },
        public:
          authorServerSettingsLookup.get(toAuthorServerSettingsLookupKey(m.authorId, m.serverId))
            ?.flags.canPubliclyDisplayMessages ?? false,
      })
    );
}

export async function findMessageById(id: string) {
  const msg = await elastic.getMessage(id);
  if (!msg) {
    return null;
  }
  // TODO: Maybe make it so that addAuthorsToMessages can take a single message
  const msgWithAuthor = await addAuthorsToMessages([msg]);
  return msgWithAuthor[0] ?? null;
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
  return addAuthorsToMessages(messages);
}

export async function findManyMessages(ids: string[]) {
  const allMessages = await elastic.bulkGetMessages(ids);
  return addAuthorsToMessages(allMessages);
}

export async function updateMessage(data: z.infer<typeof zMessage>) {
  return elastic.updateMessage(data);
}

export async function upsertMessage(data: z.infer<typeof zMessage>) {
  const ignoredAccount = await findIgnoredDiscordAccountById(data.authorId);
  if (ignoredAccount) {
    throw new DBError("Message author is ignored", "IGNORED_ACCOUNT");
  }
  return await elastic.upsertMessage(data);
}

export async function upsertManyMessages(data: z.infer<typeof zMessage>[]) {
  const authorIds = new Set(data.map((msg) => msg.authorId));
  const ignoredAccounts = await findManyIgnoredDiscordAccountsById(Array.from(authorIds));
  const ignoredAccountIds = new Set(ignoredAccounts.map((i) => i.id));
  const filteredMessages = data.filter((msg) => !ignoredAccountIds.has(msg.authorId));
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
