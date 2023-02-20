import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { Navbar } from "../primitives/Navbar";
import { BlobHome } from "./BlobHome";
import { HomeLeadText } from "./HomeLeadText";
import { QuestionAnswerArea } from "./QuestionAnswerArea/QuestionAnswerArea";
import { messageData } from "./HomeMessages";

export const Home = () => {
  return (
    <div className="absolute -z-50 h-screen w-screen overflow-hidden bg-ao-white bg-gradient-to-t from-[#10151c] to-[#354364] xl:from-transparent xl:to-transparent xl:dark:bg-ao-black/[0.79]">
      <Navbar />
      <BlobHome />

      {/* Chevron going down */}
      <div className="absolute bottom-0 w-full">
        <div className="mx-auto h-16 w-16 text-black/[.65] dark:text-white/[.65]">
          {<ChevronDownIcon strokeWidth={0.5} />}
        </div>
      </div>

      <div className="flex h-full w-full flex-row px-4 transition-all sm:px-[4rem] lg:gap-32 2xl:gap-72 2xl:px-[6rem]">
        <HomeLeadText />

        <div className="hidden items-center justify-end xl:flex xl:w-2/3 2xl:grow">
          <QuestionAnswerArea
            discordChannelName={"How do I index discord channels into google?"}
            questionMessage={messageData.questionMessage}
            answerMessage={messageData.answerMessage}
          />
        </div>
      </div>
    </div>
  );
};
