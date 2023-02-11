import { ChevronDownIcon } from "@heroicons/react/24/outline";
import type { MessageProps } from "../Message";
import { Button } from "../newComps/Button";
import { Navbar } from "../newComps/Navbar";
import { LandingAnimation } from "./LandingAnimation/LandingAnimation";

export const Home = () => {
  const firstMessage: MessageProps = {
    message: {
      content: "How do I index my discord channels into google?",
      id: "1063028763656458270",
      author: {
        name: "Jolt",
        id: "0",
        avatar: null,
      },
      public: true,
      images: [],
      channelId: "0",
      serverId: "0",
      solutions: [],
      childThread: null,
      repliesTo: null,
    },
    customMessageDateString: "Today at 15:31",
  };

  const secondMessage: MessageProps = {
    message: {
      content:
        "Hey @Jolt, you can use Answer Overflow to do that! Learn more at answeroverflow.com!",
      id: "1063028763656458270",
      author: {
        name: "Rhys",
        id: "0",
        avatar: null,
      },
      public: true,
      images: [],
      channelId: "0",
      serverId: "0",
      solutions: [],
      childThread: null,
      repliesTo: null,
    },
    customMessageDateString: "Today at 15:45",
  };

  return (
    <div className="absolute -z-50 h-screen w-screen overflow-hidden bg-ao-white dark:bg-ao-black/[0.79]">
      <Navbar />
      {/* Background shape */}
      <div className="absolute top-0 left-0 -z-10">
        <svg
          width="1056"
          height="817"
          viewBox="0 0 1056 817"
          xmlns="http://www.w3.org/2000/svg"
          className="fill-[url(#paint0_linear_59_4)] dark:fill-[url(#paint0_linear_55_32)]"
        >
          <path d="M392.438 -76.7503C305.009 -153.351 -499.663 402.837 -197.548 379.947C-197.548 402.601 -306.951 548.334 -353.705 577.572C-412.147 614.121 -273.639 674.531 -22.3395 706.548C228.96 738.566 359.87 691.446 478.507 788.405C597.144 885.363 749.099 713.729 1003.91 601.668C1258.71 489.606 501.724 19.0001 392.438 -76.7503Z" />
          <defs>
            <linearGradient
              // Dark theme
              id="paint0_linear_55_32"
              x1="1104.14"
              y1="-251.993"
              x2="-269.086"
              y2="1223.31"
              gradientUnits="userSpaceOnUse"
            >
              <stop stop-color="#86A8FF" />
              <stop offset="1" stop-opacity="0" />
            </linearGradient>

            <linearGradient
              // Light theme
              id="paint0_linear_59_4"
              x1="1104.14"
              y1="-251.993"
              x2="-269.086"
              y2="1223.31"
              gradientUnits="userSpaceOnUse"
            >
              <stop stop-color="#FFF500" />
              <stop offset="1" stop-color="#FF0000" stop-opacity="0.67" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="absolute bottom-0 w-full">
        <div className="mx-auto h-16 w-16 text-white/[.65]">
          {<ChevronDownIcon strokeWidth={0.5} />}
        </div>
      </div>

      <div className="flex h-full w-full flex-row gap-72 px-4 transition-all sm:px-[4rem] 2xl:px-[6rem]">
        <div className="flex w-full flex-col items-start justify-center gap-6 xl:w-[60%]">
          <h1 className="text-center font-header text-4xl font-bold leading-[114.5%] text-ao-white md:text-start md:text-6xl">
            Bringing your discord channels to google
          </h1>
          <p className="text-center font-body text-lg text-ao-white dark:text-ao-white/[.85] md:text-start md:text-xl">
            Answer Overflow is an open source project designed to......................
          </p>
          <Button type={"solid"} color={"white"} className="mx-auto xl:mx-0">
            <span className="text-2xl">Get Started</span>
          </Button>
        </div>

        {/* Discord animation */}
        <div className="hidden grow items-center justify-end xl:flex">
          <LandingAnimation questionMessageData={firstMessage} answerMessageData={secondMessage} />
        </div>
      </div>
    </div>
  );
};
