import { useState } from "react";
import { Input } from "../primitives/Input";
import { Navbar } from "../primitives/Navbar";

export const SearchPage = () => {
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
      </div>
    </div>
  );
};
