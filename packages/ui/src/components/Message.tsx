import { Avatar } from "./Avatar";
import { getSnowflakeUTCDate } from "~ui/utils/snowflake";
import Image from "next/image";
import discordMarkdown from "discord-markdown";
import Parser from "html-react-parser";

import type { MessageWithDiscordAccount } from "@answeroverflow/api";
import { DiscordIcon } from "./icons/DiscordIcon";
import Link from "next/link";
import type { ChannelPublic } from "~api/router/channel/types";
export type MessageProps = {
  message: MessageWithDiscordAccount;
  thread?: ChannelPublic;
  blurred?: boolean;
  not_public_title?: string;
};

const { toHTML } = discordMarkdown;

// TODO: Align text to be same level with the avatar
export function Message({
  message,
  thread,
  blurred = false,
  not_public_title = "Message Not Public",
}: MessageProps) {
  const date_of_message = getSnowflakeUTCDate(message.id);
  const convertedMessageContent = toHTML(message.content);
  const parsedMessageContent = Parser(convertedMessageContent);

  function MessageImage({ image }: { image: MessageWithDiscordAccount["images"][number] }) {
    let width = image.width;
    let height = image.height;
    const max_width = 400;
    const max_height = 300;

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
    const original_width = width;
    const original_height = height;
    if (width > height) {
      width = max_width;
      height = (max_width / original_width) * original_height;
    } else {
      height = max_height;
      width = (max_height / original_height) * original_width;
    }

    const aspect_ratio = width / height;
    return (
      <Image
        key={image.url}
        src={image.url}
        width={original_width}
        height={original_height}
        alt={image.description ? image.description : "Image"}
        style={{
          maxWidth: `${width}px`,
          maxHeight: `${max_height}px`,
          aspectRatio: `${aspect_ratio}`,
        }}
      />
    );
  }

  function getMessageUrl({
    server_id,
    channel_id,
    message_id,
    thread_id,
  }: {
    server_id: string;
    channel_id: string;
    message_id: string;
    thread_id?: string;
  }) {
    const endpoint = `${server_id}/${channel_id}/${thread_id ? thread_id + "/" : ""}${message_id}`;
    return `discord://discord.com/channels/${endpoint}`;
  }

  const Contents = () => (
    <div className="group relative flex  w-full break-words rounded-xl p-1 ">
      <div className="mr-4 hidden shrink-0 sm:block">
        <Avatar user={message.author} />
      </div>
      <div className="w-full">
        <div className="flex w-full min-w-0  justify-between">
          <div className="flex min-w-0 gap-2">
            <Avatar user={message.author} className="shrink-0 sm:hidden" />
            <div className="flex flex-col sm:flex-row">
              <span className="mr-1 text-black dark:text-white">{message.author.name}</span>
              <span className="text-neutral-800 dark:text-neutral-400">{date_of_message}</span>
            </div>
          </div>
          <Link
            href={getMessageUrl({
              server_id: message.server_id,
              channel_id: thread && thread.parent_id ? thread.parent_id : message.channel_id,
              message_id: message.id,
              thread_id: thread?.id,
            })}
            className="invisible flex h-6 w-6 group-hover:visible"
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

  const blur_amount = ".4rem";

  return (
    <div className="relative h-full w-full">
      {blurred ? (
        <>
          <div
            style={{
              filter: `blur(${blur_amount})`,
              backdropFilter: `blur(${blur_amount})`,
              WebkitBackdropFilter: `blur(${blur_amount})`,
              WebkitFilter: `blur(${blur_amount})`,
              msFilter: `blur(${blur_amount})`,
            }}
          >
            <Contents />
          </div>
          <div>
            <div className="absolute inset-0 " />
            <div className="absolute inset-0 flex items-center justify-center ">
              <div className="flex flex-col items-center justify-center text-center text-black dark:text-white">
                <div className="text-2xl ">{not_public_title}</div>
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
