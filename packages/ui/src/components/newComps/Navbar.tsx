import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { AnswerOverflowLogo } from "../AnswerOverflowLogo";
import { Button } from "./Button";

export const Navbar = () => {
  return (
    <nav className="absolute top-0 left-0 z-50 flex h-32 w-full items-center">
      <div className="flex w-full items-center justify-center lg:hidden">
        <a href="/" aria-label="AnswerOverflow Logo">
          <AnswerOverflowLogo />
        </a>
      </div>
      <ol className="mx-[4rem] hidden w-full flex-row transition-all lg:flex 2xl:mx-[6rem]">
        <li>
          <a href="/" aria-label="AnswerOverflow Logo">
            <AnswerOverflowLogo />
          </a>
        </li>
        <li className="mx-6 ml-auto hidden md:block">
          <button className="h-full w-full" aria-label="Search">
            <MagnifyingGlassIcon width={"1.5rem"} height={"1.5rem"} />
          </button>
        </li>
        {/* <li className="mx-8 flex items-center justify-center">
          <a href="/" className="text-2xl font-normal text-ao-black hover:text-neutral-800">
            Sign In
          </a>
        </li> */}
        <li className="ml-6 hidden items-center justify-center md:flex">
          <Button type={"ghost"} color={"white"}>
            <span className="text-xl">Add to server</span>
          </Button>
        </li>
      </ol>
    </nav>
  );
};
