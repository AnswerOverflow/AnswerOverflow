import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { Button } from "./Button";

export const Navbar = () => {
  return (
    <nav className="absolute top-0 left-0 flex h-32 w-full items-center">
      <ol className="mx-[4rem] flex w-full flex-row transition-all 2xl:mx-[6rem]">
        <li>
          <a href="#" className="text-3xl font-bold">
            Logo
          </a>
        </li>
        <li className="mx-8 ml-auto">
          <button className="h-full w-full">
            <MagnifyingGlassIcon width={"2rem"} height={"2rem"} />
          </button>
        </li>
        <li className="mx-8 flex items-center justify-center">
          <a href="#" className="text-3xl font-bold">
            Sign In
          </a>
        </li>
        <li className="ml-8">
          <Button type={"ghost"} color={"black"}>
            <span className="text-2xl">Add to server</span>
          </Button>
        </li>
      </ol>
    </nav>
  );
};
