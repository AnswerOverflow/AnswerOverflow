import Image from "next/image";
import Link from "next/link";
import React from "react";

const FooterHero = () => {
  return (
    <div className="bg-primary">
      <div className="flex flex-wrap md:flex-nowrap justify-between container py-20 px-6 sm:px-0">
        <div className="max-w-[802px]">
          <h2 className="font-montserrat text-wrap text-white not-italic text-3xl md:text-[57px] font-semibold sm:leading-[109.3%] sm:tracking-[-1.425px] leading-[97.3%] tracking-[-0.75px] pb-[31px] sm:pb-[38px]">
            Start Your Intelligent Note-Taking Journey
          </h2>
          <p className="text-white max-w-[681px] text-xl sm:text-3xl not-italic font-normal leading-[103.3%] tracking-[-0.75px] font-montserrat pb-[66px] sm:pb-[53px]">
            Sign up now and experience the power of AI-enhanced note-taking with
            UseNotes
          </p>
          <Link href={"/notes"}>
            <button className="linear_gradient flex max-w-[438px] w-full justify-center items-center gap-2.5 shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] px-8 py-4 rounded-[11px]  text-black text-xl sm:text-3xl not-italic font-semibold leading-[90.3%] tracking-[-0.75px]">
              Get Started For Free
            </button>
          </Link>
        </div>
        <div className="mt-20 md:mt-0">
          <Image
            src="/images/monitor.png"
            alt="hero"
            width={560}
            height={456}
          />
        </div>
      </div>
    </div>
  );
};

export default FooterHero;
