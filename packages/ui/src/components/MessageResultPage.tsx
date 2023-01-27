import type { ChannelPublic, MessageWithDiscordAccount, ServerPublic } from "@answeroverflow/api";
import { Message } from "./Message";
import { SearchBar } from "./SearchBar";
import { ServerInviteDriver } from "./ServerInviteDriver";

export type MessageResultPageProps = {
  messages: MessageWithDiscordAccount[];
  server: ServerPublic;
  channel: ChannelPublic;
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
  let solution_message_id: string | undefined;
  const MessageStack = ({ messages }: { messages: MessageWithDiscordAccount[] }) => (
    <div className="mt-3 flex flex-col space-y-1 rounded-md p-1">
      {messages.map((message, index) => {
        const Msg = () => <Message message={message} key={message.id} thread={thread} />;
        // Highlight the root question message with a grey border
        if (index === 0) {
          solution_message_id = message.solutions[0];
          return (
            <div className="text-neutral-700 dark:text-neutral-300" key={message.id}>
              Question
              <div
                className="rounded-lg border-2 border-neutral-300 dark:border-neutral-700  "
                key={message.id}
              >
                <Msg />
              </div>
            </div>
          );
        }
        // Highlight the solution message with a green border
        if (message.id === solution_message_id) {
          return (
            <div className="text-green-500 dark:text-green-400" key={message.id}>
              Solution
              <div
                className="rounded-lg border-2 border-green-500  dark:border-green-400 "
                key={message.id}
              >
                <Msg />
              </div>
            </div>
          );
        }
        return <Msg key={message.id} />;
      })}
    </div>
  );

  return (
    <div className="mx-3 ">
      <div className=" flex flex-col items-center justify-between gap-2 sm:flex-row">
        <SearchBar className="w-full" default_value={query} />
        <div className="shrink-0 ">
          <ServerInviteDriver server={server} channel={channel} />
        </div>
      </div>
      <MessageStack messages={messages} />
    </div>
  );
}

export default MessageResultPage;
