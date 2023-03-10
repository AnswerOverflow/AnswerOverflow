import type { APISearchResult, ChannelPublicWithFlags, ServerPublic } from "@answeroverflow/api";
import { DiscordAvatar } from "~ui/components/DiscordAvatar";
import {
  Message,
  MessageAuthorArea,
  MessageContents,
  MessageTitle,
} from "~ui/components/primitives/Message";
import { Button } from "../primitives/Button";

export interface MessageResultProps {
  result: APISearchResult[number];
}

const ServerInvite = ({
  server,
  channel,
}: {
  server: ServerPublic;
  channel?: ChannelPublicWithFlags;
}) => {
  return (
    <div className="flex flex-col items-center justify-center pt-6 pb-2 xl:px-5">
      <div className="h-24 w-24 rounded-[50%] border-2 border-white bg-[#9A9A9A]" />
      <h3 className="pt-2 text-center font-header text-2xl font-bold text-ao-white">
        {server.name}
      </h3>
      {channel && (
        <>
          <h5 className="text-center text-xl font-light text-ao-white/[.9]">#{channel.name}</h5>
          <Button type={"solid"} color={"white"} className="my-4">
            Join Server
          </Button>
        </>
      )}
    </div>
  );
};

// TODO: Use data from the API
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SearchResultMetaData = ({ result }: MessageResultProps) => {
  return (
    <div className="mt-2 flex flex-row items-center justify-center">
      {/* Chat */}
      <span className="flex items-center justify-center px-1 text-white/[.55]">{0}</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-6 w-6 text-white/[.55]"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
        />
      </svg>

      {/* TODO: Make into proper circle, make a11y */}
      <div className="ml-2 h-2 w-2 rounded-[50%] bg-white/[.55]" />

      <span className="px-1 text-white/[.55]">{0}</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-6 w-6 text-white/[.55]"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </div>
  );
};

export const SearchResult = ({ result }: MessageResultProps) => {
  const solution = result.message.solutionMessages?.[0];
  return (
    <div className="flex h-full w-full flex-row rounded-standard border-2 border-[#696969]/[.42] bg-[#181B1F]">
      {/* Body */}
      <div className="flex grow flex-col">
        <div className="grow border-white/[.13] pb-6 lg:border-r-2 lg:py-6">
          {/* Timestamp area */}
          <div className="flex flex-row gap-2 border-b-1 border-white/[.13] px-6 py-4 lg:border-0 lg:py-0">
            <DiscordAvatar user={result.message.author} size={"sm"} />
            <MessageAuthorArea message={result.message} />
          </div>
          <div className="px-6">
            <MessageTitle channel={result.channel} thread={result.thread} />
            <MessageContents message={result.message} />
          </div>
        </div>

        {/* Answer */}
        {solution && (
          <div className="border-white/[.13] lg:border-r-2">
            <Message message={solution} />
          </div>
        )}
      </div>
      <div className="hidden w-1/4 flex-col items-center justify-center px-5 pt-6 pb-2 lg:flex">
        {/* Server Invite */}
        <ServerInvite server={result.server} channel={result.channel} />
        <SearchResultMetaData result={result} />
      </div>
    </div>
  );
};
