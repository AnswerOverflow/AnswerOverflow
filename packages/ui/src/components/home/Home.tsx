import type { MessageProps } from "../Message";
import { Button } from "../newComps/Button";
import { Navbar } from "../newComps/Navbar";
import { LandingAnimation } from "./LandingAnimation/LandingAnimation";

export const Home = () => {
  const first_message: MessageProps = {
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
      channel_id: "0",
      server_id: "0",
      solutions: [],
      child_thread: null,
      replies_to: null,
    },
    customMessageDateString: "Today at 15:31",
  };

  const second_message: MessageProps = {
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
      channel_id: "0",
      server_id: "0",
      solutions: [],
      child_thread: null,
      replies_to: null,
    },
    customMessageDateString: "Today at 15:45",
  };

  return (
    <div className="h-screen w-screen bg-ao-white">
      <Navbar />
      <div className="flex h-full w-full flex-row gap-72 px-[4rem] transition-all 2xl:px-[6rem]">
        <div className="flex w-full flex-col items-start justify-center gap-4 xl:w-[60%]">
          <h1 className="font-header text-6xl font-bold leading-[114.5%] text-ao-black">
            Bringing your discord channels to google
          </h1>
          <p className="font-body text-xl text-ao-black/[.85]">
            Answer Overflow is an open source project designed to......................
          </p>
          <Button type={"solid"} color={"black"}>
            <span className="text-xl">Get Started</span>
          </Button>
        </div>

        {/* Discord animation */}
        <div className="flex grow items-center justify-end">
          <LandingAnimation
            questionMessageData={first_message}
            answerMessageData={second_message}
          />
        </div>
      </div>
    </div>
  );
};
