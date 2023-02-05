import { Button } from "../newComps/Button";
import { Navbar } from "../newComps/Navbar";

export const Home = () => {
  return (
    <div className="h-screen w-screen bg-ao-white">
      <Navbar />
      <div className="flex h-full w-full flex-row px-[4rem] transition-all 2xl:px-[6rem]">
        <div className="flex w-[40%] flex-col items-start justify-center gap-4">
          <h1 className="font-header text-6xl font-bold leading-[114.5%] text-ao-black">
            Bringing your discord channels to google
          </h1>
          <h4 className="font-body text-xl text-ao-black/[.85]">
            Answer Overflow is an open source project designed to......................
          </h4>
          <Button type={"solid"} color={"black"}>
            <span className="text-xl">Get Started</span>
          </Button>
        </div>

        {/* Discord animation */}
        <div></div>
      </div>
    </div>
  );
};
