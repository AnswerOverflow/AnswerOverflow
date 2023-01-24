import type { ChannelPublic, MessageWithDiscordAccount, ServerPublic } from "@answeroverflow/api";
import { Message } from "./Message";
import { SearchBar } from "./SearchBar";
import { ServerInviteDriver } from "./ServerInviteDriver";

export type MessageResultPageProps = {
  messages: MessageWithDiscordAccount[];
  server: ServerPublic;
  channel: ChannelPublic;
};

// TODO: Align text to be same level with the avatar
export function MessageResultPage({ messages, server, channel }: MessageResultPageProps) {
  const MessageStack = ({ messages }: { messages: MessageWithDiscordAccount[] }) => (
    <div className="flex flex-col space-y-2">
      {messages.map((message) => (
        <Message message={message} key={message.id} />
      ))}
    </div>
  );

  return (
    <>
      <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
        <SearchBar className="w-full" />
        <div className="shrink-0">
          <ServerInviteDriver server={server} channel={channel} />
        </div>
      </div>
      <MessageStack messages={messages} />
    </>
  );
}

export default MessageResultPage;
