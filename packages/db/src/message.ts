import { z } from "zod";
import {
  addFlagsToUserServerSettings,
  Elastic,
  findIgnoredDiscordAccountById,
  findManyIgnoredDiscordAccountsById,
  Message,
  PrismaClient,
  z_discord_account_public,
} from "..";
import { z_message } from "./zod-schemas";
export type MessageWithDiscordAccount = z.infer<typeof z_message_with_discord_account>;
export const z_message_with_discord_account = z_message
  .extend({
    author: z_discord_account_public,
    public: z.boolean().default(false),
  })
  .omit({ author_id: true });

export const z_find_messages_by_channel_id = z.object({
  channel_id: z.string(),
  after: z.string().optional(),
  limit: z.number().optional(),
});

export async function addAuthorsToMessages(messages: Message[], prisma: PrismaClient) {
  const authors = await prisma.discordAccount.findMany({
    where: {
      id: {
        in: messages.map((m) => m.author_id),
      },
    },
    include: {
      user_server_settings: {
        where: {
          server_id: {
            in: messages.map((m) => m.server_id),
          },
        },
      },
    },
  });
  const toAuthorServerSettingsLookupKey = (discord_id: string, server_id: string) =>
    `${discord_id}-${server_id}`;

  const author_server_settings_lookup = new Map(
    authors.flatMap((a) =>
      a.user_server_settings.map((uss) => [
        toAuthorServerSettingsLookupKey(uss.user_id, uss.server_id),
        addFlagsToUserServerSettings(uss),
      ])
    )
  );

  const author_lookup = new Map(authors.map((a) => [a.id, a]));

  return messages
    .filter((m) => author_lookup.has(m.author_id))
    .map(
      (m): z.infer<typeof z_message_with_discord_account> => ({
        ...m,
        author: {
          ...z_discord_account_public.parse(author_lookup.get(m.author_id)!),
        },
        public:
          author_server_settings_lookup.get(
            toAuthorServerSettingsLookupKey(m.author_id, m.server_id)
          )?.flags.can_publicly_display_messages ?? false,
      })
    );
}

export async function findMessageById(id: string, elastic: Elastic, prisma: PrismaClient) {
  const msg = await elastic.getMessage(id);
  if (!msg) {
    return null;
  }
  // TODO: Maybe make it so that addAuthorsToMessages can take a single message
  const msg_with_author = await addAuthorsToMessages([msg], prisma);
  return msg_with_author[0]!;
}

export async function findMessagesByChannelId(
  input: z.infer<typeof z_find_messages_by_channel_id>,
  elastic: Elastic,
  prisma: PrismaClient
) {
  const messages = await elastic.bulkGetMessagesByChannelId(
    input.channel_id,
    input.after,
    input.limit
  );
  if (messages.length === 0) {
    return [];
  }
  return addAuthorsToMessages(messages, prisma);
}

export async function bulkGetMessages(ids: string[], elastic: Elastic, prisma: PrismaClient) {
  const all_messages = await elastic.bulkGetMessages(ids);
  return addAuthorsToMessages(all_messages, prisma);
}

export async function updateMessage(data: z.infer<typeof z_message>, elastic: Elastic) {
  return elastic.updateMessage(data);
}

export async function upsertMessage(
  data: z.infer<typeof z_message>,
  elastic: Elastic,
  prisma: PrismaClient
) {
  const ignored_account = await findIgnoredDiscordAccountById(data.author_id, prisma);
  if (ignored_account) {
    throw new Error("Cannot upsert message for ignored account");
  }
  return await elastic.upsertMessage(data);
}

export async function upsertManyMessages(
  data: z.infer<typeof z_message>[],
  elastic: Elastic,
  prisma: PrismaClient
) {
  const author_ids = new Set(data.map((msg) => msg.author_id));
  const ignored_accounts = await findManyIgnoredDiscordAccountsById(Array.from(author_ids), prisma);
  const ignored_account_ids = new Set(ignored_accounts.map((i) => i.id));
  const filtered_messages = data.filter((msg) => !ignored_account_ids.has(msg.author_id));
  return elastic.bulkUpsertMessages(filtered_messages);
}

export async function deleteMessage(id: string, elastic: Elastic) {
  return elastic.deleteMessage(id);
}

export async function deleteManyMessages(ids: string[], elastic: Elastic) {
  return elastic.bulkDeleteMessages(ids);
}
