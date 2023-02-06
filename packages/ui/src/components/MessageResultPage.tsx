import type {
  ChannelPublic,
  ChannelPublicWithSettings,
  MessageWithDiscordAccount,
  ServerPublic,
} from "@answeroverflow/api";
import { useIsUserInServer } from "../utils";
import { Message } from "./Message";
import { SearchBar } from "./SearchBar";
import { ServerInviteDriver } from "./ServerInviteDriver";

export type MessageResultPageProps = {
  messages: MessageWithDiscordAccount[];
  server: ServerPublic;
  channel: ChannelPublicWithSettings;
  thread?: ChannelPublic;
  // The query that lead to this result page
  query?: string;
};

// TODO: Align text to be same level with the avatar
export function MessageResultPage({
  messages,
  server,
  channel,
  thread,
  query,
}: MessageResultPageProps) {
  const solution_message_id = messages.at(0)?.solutions?.at(0);
  const MessageStack = ({ messages }: { messages: MessageWithDiscordAccount[] }) => {
    let consecutive_private_messages = 0;
    const is_user_in_server = useIsUserInServer(server.id);
    return (
      <div className="mt-3 flex flex-col rounded-md sm:space-y-1 sm:p-1">
        {messages.map((message, index) => {
          const next_message = messages.at(index + 1);
          if (!message.public && !is_user_in_server) {
            consecutive_private_messages++;
            if (next_message && !next_message.public) {
              return;
            }
          } else {
            consecutive_private_messages = 0;
          }
          const Msg = ({
            consecutive_private_messages,
          }: {
            consecutive_private_messages: number;
          }) => {
            if (!message.public) {
              return (
                <Message
                  message={message}
                  thread={thread}
                  blurred={!message.public}
                  not_public_title={
                    consecutive_private_messages > 1
                      ? `${consecutive_private_messages} Messages Not Public`
                      : undefined
                  }
                />
              );
            }
            if (message.id === solution_message_id) {
              return (
                <div className="text-green-500 dark:text-green-400">
                  Solution
                  <div
                    className="rounded-lg border-2 border-green-500  dark:border-green-400 "
                    key={message.id}
                  >
                    <Message message={message} thread={thread} blurred={!message.public} />
                  </div>
                </div>
              );
            }
            return <Message message={message} thread={thread} blurred={!message.public} />;
          };
          return (
            <div key={message.id} className="mb-2">
              <Msg consecutive_private_messages={consecutive_private_messages} />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="sm:mx-3 ">
      <div className=" flex flex-col items-center justify-between gap-2 sm:flex-row">
        <SearchBar className="w-full" default_value={query} />
        <div className="shrink-0 ">
          <ServerInviteDriver server={server} channel={channel} />
        </div>
      </div>
      <div className="rounded-md bg-neutral-100 p-3 dark:bg-[#2c2d2d] sm:mt-3">
        <h1 className="rounded-sm border-b-2 border-solid border-neutral-400 pb-2 text-3xl dark:border-neutral-600 dark:text-white">
          {thread ? thread.name : channel.name}
        </h1>
        <MessageStack messages={messages} />
      </div>
    </div>
  );
}

export default MessageResultPage;
