import Image from "next/image";
import { forwardRef } from "react";

export interface GooglePageProps {
  result: {
    url: string;
    title: string;
    description: string;
  };
}

export const GooglePage = forwardRef<HTMLDivElement, GooglePageProps>(function GooglePageFunc(
  { result },
  ref
) {
  return (
    <div className="flex min-h-[10rem] w-full flex-col items-center justify-center gap-5 rounded-md bg-[#202124] py-5">
      {/* Searchbar */}
      <div className="flex w-full flex-col items-center justify-center gap-5 px-5 2xl:flex-row">
        <div className="relative hidden h-14 w-28 2xl:block">
          <Image src={"./googlelogo.png"} alt={"Google Logo"} fill className="object-contain" />
        </div>
        <div className="w-full grow rounded-[24px] bg-[#303134] py-3 px-5 font-sans text-[#e8eaed]">
          <span>How do I index my discord channels into google?</span>
        </div>
      </div>

      {/* Result */}
      <div className="flex flex-col items-start justify-center px-5 font-['arial']">
        <div className="group hover:cursor-pointer">
          <div className="flex w-full flex-row items-center justify-start">
            <span className="text-[14px] text-[#bdc1c6]">{result.url}</span>
            <div className="ml-[12px] h-[22px] w-[22px] hover:cursor-pointer">
              <svg
                focusable="false"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="#9aa0a6"
              >
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path>
              </svg>
            </div>
          </div>
          <div ref={ref}>
            <h3 className="mb-[3px] pt-[5px] text-[20px] text-[#8ab4f8] group-hover:underline">
              {result.title}
            </h3>
          </div>
        </div>
        <p className="text-[14px] leading-[1.58] text-[#bdc1c6]">{result.description}</p>
      </div>
    </div>
  );
});
