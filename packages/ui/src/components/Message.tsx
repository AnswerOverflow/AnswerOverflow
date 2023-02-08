import { DiscordAvatar } from "./DiscordAvatar";
import { getSnowflakeUTCDate } from "~ui/utils/snowflake";
import Image from "next/image";
import discordMarkdown from "discord-markdown";
import Parser from "html-react-parser";

import type { MessageWithDiscordAccount } from "@answeroverflow/api";
import { DiscordIcon } from "./icons/DiscordIcon";
import Link from "next/link";
import type { ChannelPublicWithFlags } from "~api/router/channel/types";
import { useIsUserInServer } from "../utils";
export type MessageProps = {
  message: MessageWithDiscordAccount;
  thread?: ChannelPublicWithFlags;
  blurred?: boolean;
  notPublicTitle?: string;
};

const { toHTML } = discordMarkdown;

// TODO: Align text to be same level with the avatar
export function Message({
  message,
  thread,
  blurred = false,
  notPublicTitle = "Message Not Public",
}: MessageProps) {
  const dateOfMessage = getSnowflakeUTCDate(message.id);
  const convertedMessageContent = toHTML(message.content);
  const parsedMessageContent = Parser(convertedMessageContent);
  const isUserInServer = useIsUserInServer(message.serverId);
  if (isUserInServer) {
    blurred = false;
  }

  function MessageImage({ image }: { image: MessageWithDiscordAccount["images"][number] }) {
    let width = image.width;
    let height = image.height;
    const maxWidth = 400;
    const maxHeight = 300;

    if (!width || !height)
      return (
        // TODO: Bit of a hack for now since next images don't work well with no w/h specified
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="max-w-full md:max-w-sm"
          src={image.url}
          style={{
            width: "fit-content",
            height: "auto",
            objectFit: "cover",
          }}
          alt={image.description ? image.description : "Image"}
        />
      );
    const originalWidth = width;
    const originalHeight = height;
    if (width > height) {
      width = maxWidth;
      height = (maxWidth / originalWidth) * originalHeight;
    } else {
      height = maxHeight;
      width = (maxHeight / originalHeight) * originalWidth;
    }

    const aspectRatio = width / height;
    return (
      <Image
        key={image.url}
        src={image.url}
        width={originalWidth}
        height={originalHeight}
        alt={image.description ? image.description : "Image"}
        style={{
          maxWidth: `${width}px`,
          maxHeight: `${maxHeight}px`,
          aspectRatio: `${aspectRatio}`,
        }}
      />
    );
  }

  function getMessageUrl({
    serverId,
    channelId,
    messageId,
    threadId,
  }: {
    serverId: string;
    channelId: string;
    messageId: string;
    threadId?: string;
  }) {
    const endpoint = `${serverId}/${channelId}/${threadId ? threadId + "/" : ""}${messageId}`;
    return `discord://discord.com/channels/${endpoint}`;
  }

  const Contents = () => (
    <div className="group relative flex  w-full break-words rounded-xl p-1 ">
      <div className="mr-4 hidden shrink-0 sm:block">
        <DiscordAvatar user={message.author} />
      </div>
      <div className="w-full">
        <div className="flex w-full min-w-0  justify-between">
          <div className="flex min-w-0 gap-2">
            <div className="shrink-0 sm:hidden">
              <DiscordAvatar user={message.author} />
            </div>
            <div className="flex flex-col sm:flex-row">
              <span className="mr-1 text-black dark:text-white">{message.author.name}</span>
              <span className="text-neutral-800 dark:text-neutral-400">{dateOfMessage}</span>
            </div>
          </div>
          <Link
            href={getMessageUrl({
              serverId: message.serverId,
              channelId: thread && thread.parentId ? thread.parentId : message.channelId,
              messageId: message.id,
              threadId: thread?.id,
            })}
            className="invisible flex h-6 w-6 group-hover:visible"
            aria-label="Open in Discord"
          >
            <DiscordIcon color="blurple" />
          </Link>
        </div>
        <div className="mt-2 max-w-[80vw] text-black dark:text-neutral-50 sm:mt-0 sm:max-w-[70vw] md:max-w-full">
          {parsedMessageContent}
        </div>
        <div className="grid gap-2">
          {message.images.map((image) => (
            <MessageImage key={image.url} image={image} />
          ))}
        </div>
      </div>
    </div>
  );

  const blurAmount = ".4rem";

  return (
    <div className="relative h-full w-full">
      {blurred ? (
        <>
          <div
            style={{
              filter: `blur(${blurAmount})`,
              backdropFilter: `blur(${blurAmount})`,
              WebkitBackdropFilter: `blur(${blurAmount})`,
              WebkitFilter: `blur(${blurAmount})`,
              msFilter: `blur(${blurAmount})`,
            }}
          >
            <Contents />
          </div>
          <div>
            <div className="absolute inset-0 " />
            <div className="absolute inset-0 flex items-center justify-center ">
              <div className="flex flex-col items-center justify-center text-center text-black dark:text-white">
                <div className="text-2xl ">{notPublicTitle}</div>
                <div>Sign In & Join Server To View</div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <Contents />
      )}
    </div>
  );
}
