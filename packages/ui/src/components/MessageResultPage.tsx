import type {
  ChannelPublicWithFlags,
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
  channel: ChannelPublicWithFlags;
  thread?: ChannelPublicWithFlags;
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
  const solutionMessageId = messages.at(0)?.solutions?.at(0);
  const MessageStack = ({ messages }: { messages: MessageWithDiscordAccount[] }) => {
    let consecutivePrivateMessages = 0;
    const isUserInServer = useIsUserInServer(server.id);
    return (
      <div className="mt-3 flex flex-col rounded-md sm:space-y-1 sm:p-1">
        {messages.map((message, index) => {
          const nextMessage = messages.at(index + 1);
          if (!message.public && !isUserInServer) {
            consecutivePrivateMessages++;
            if (nextMessage && !nextMessage.public) {
              return;
            }
          } else {
            consecutivePrivateMessages = 0;
          }
          const Msg = ({ consecutivePrivateMessages }: { consecutivePrivateMessages: number }) => {
            if (!message.public) {
              return (
                <Message
                  message={message}
                  thread={thread}
                  blurred={!message.public}
                  notPublicTitle={
                    consecutivePrivateMessages > 1
                      ? `${consecutivePrivateMessages} Messages Not Public`
                      : undefined
                  }
                />
              );
            }
            if (message.id === solutionMessageId) {
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
              <Msg consecutivePrivateMessages={consecutivePrivateMessages} />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="sm:mx-3 ">
      <div className=" flex flex-col items-center justify-between gap-2 sm:flex-row">
        <SearchBar className="w-full" defaultValue={query} />
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
