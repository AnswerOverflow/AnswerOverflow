import type { APISearchResult } from "@answeroverflow/api";
import { useState } from "react";
import { MessageResult } from "~ui/components/MessageResult/MessageResult";
import { Input } from "~ui/components/primitives/Input";
import { Navbar } from "../primitives/Navbar";

interface SearchResultProps {
  results?: APISearchResult;
}

export const SearchPage = ({ results }: SearchResultProps) => {
  const [searchInput, setSearchInput] = useState<string>("");

  return (
    <div className="min-h-screen w-full bg-ao-white dark:bg-ao-black">
      <Navbar />
      <div className="w-full px-[4rem] 2xl:px-[6rem]">
        <h1 className="py-4 font-header text-3xl text-ao-black dark:text-ao-white xl:text-5xl">
          Search
        </h1>
        <Input onChange={setSearchInput} type="buttonInput" fill placeholder="Search">
          Search
        </Input>

        {/* Search */}
        {results &&
          results.map((result) => {
            return (
              <MessageResult
                authorAvatar={result.message.author.avatar}
                authorName={result.message.author.name}
                questionPostedTimestamp={"TODO"}
                title={"TODO"}
                description={result.message.content}
                views={result.score}
                comments={0}
                server={{
                  serverIcon: result.server.icon,
                  serverName: result.server.name,
                  channelName: result.channel.name,
                }}
                response={false}
              />
            );
          })}
      </div>
    </div>
  );
};
