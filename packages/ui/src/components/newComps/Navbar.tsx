import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { AnswerOverflowLogo } from "../AnswerOverflowLogo";
import { Button } from "./Button";

export const Navbar = () => {
  return (
    <nav className="absolute top-0 left-0 flex h-32 w-full items-center">
      <ol className="mx-[4rem] flex w-full flex-row transition-all 2xl:mx-[6rem]">
        <li>
          <a href="/" className="text-3xl font-bold" aria-label="AnswerOverflow Logo">
            <AnswerOverflowLogo />
          </a>
        </li>
        <li className="mx-8 ml-auto">
          <button className="h-full w-full">
            <MagnifyingGlassIcon width={"1.5rem"} height={"1.5rem"} />
          </button>
        </li>
        <li className="mx-8 flex items-center justify-center">
          <a href="/" className="text-2xl font-normal text-ao-black hover:text-neutral-800">
            Sign In
          </a>
        </li>
        <li className="ml-8 flex items-center justify-center">
          <Button type={"ghost"} color={"black"}>
            <span className="text-2xl">Add to server</span>
          </Button>
        </li>
      </ol>
    </nav>
  );
};
