import Avatar, { AvatarProps } from "./Avatar";
import { getUTCDate as getSnowflakeUTCDate } from "~ui/utils/snowflake";
import Image from "next/image";
export type MessageProps = {
  message: {
    id: string;
    channel_id: string;
    server_id: string;
    content: string;
    images: {
      url: string;
      width: number;
      height: number;
      description?: string;
    }[];
    solutions: string[];
    author: AvatarProps["user"];
    replies_to?: string;
    thread_id?: string;
    child_thread?: string;
    reply_count?: number;
  };
};

// TODO: Align text to be same level with the avatar
function Message({ message }: MessageProps) {
  const date_of_message = getSnowflakeUTCDate(`${BigInt(message.id)}`);

  return (
    <div className="flex break-words p-1 dark:bg-zinc-700">
      <div className="mr-4 shrink-0">
        <Avatar user={message.author} />
      </div>
      <div className="min-w-0">
        <h3>
          <span className="mr-1 dark:text-white">{message.author.name}</span>
          <span className="dark:text-neutral-400">{date_of_message}</span>
        </h3>
        <div>
          <p className="mt-1 dark:text-neutral-50">{message.content}</p>
          <div className="grid gap-2">
            {message.images.map((image) => {
              let width = image.width;
              let height = image.height;
              const max_width = 400;
              const max_height = 300;
              if (width > height) {
                width = max_width;
                height = (max_width / image.width) * image.height;
              } else {
                height = max_height;
                width = (max_height / image.height) * image.width;
              }
              const aspect_ratio = width / height;
              return (
                <div key={image.url}>
                  <Image
                    src={image.url}
                    width={image.width}
                    height={image.height}
                    alt={image.description ? image.description : "No alt text"}
                    style={{
                      maxWidth: `${width}px`,
                      maxHeight: `${max_height}px`,
                      aspectRatio: `${aspect_ratio}`,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Message;
