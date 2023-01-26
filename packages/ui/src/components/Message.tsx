import { Avatar } from "./Avatar";
import { getSnowflakeUTCDate } from "~ui/utils/snowflake";
import Image from "next/image";
import type { MessageWithDiscordAccount } from "@answeroverflow/api";
export type MessageProps = {
  message: MessageWithDiscordAccount;
};

// TODO: Align text to be same level with the avatar
export function Message({ message }: MessageProps) {
  const date_of_message = getSnowflakeUTCDate(message.id);

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

  return (
    <div className="flex break-words rounded-xl p-1 dark:bg-neutral-800">
      <div className="mr-4 shrink-0">
        <Avatar user={message.author} />
      </div>
      <div className="min-w-0">
        <h3>
          <span className="mr-1 text-black dark:text-white">{message.author.name}</span>
          <span className="text-neutral-800 dark:text-neutral-400">{date_of_message}</span>
        </h3>
        <div>
          <p className="mt-1 text-black dark:text-neutral-50">{message.content}</p>
          <div className="grid gap-2">
            {message.images.map((image) => (
              <MessageImage key={image.url} image={image} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
