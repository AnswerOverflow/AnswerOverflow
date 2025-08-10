import Image from "next/image";
interface Props {
  data: {
    feature?: boolean;
    review: string;
    profile: string;
    name: string;
    designation: string;
  };
}

const TestTimonialCard = ({ data }: Props) => {
  return (
    <div
      className={`max-w-[370px] w-full space-y-8 h-auto shrink-0 rounded-[20px] border-[1.5px] border-solid border-[#EAECF0] px-[35px] pt-14 pb-20 ${
        data.feature ? "bg-primary" : "bg-white"
      } $}`}
    >
      <div className="flex gap-2">
        {Array(5)
          .fill(0)
          .map((data, index) => (
            <Image
              src="/images/star.svg"
              width={29}
              height={29}
              alt="star"
              key={index}
            />
          ))}
      </div>
      <blockquote
        className={` text-lg not-italic font-normal leading-[26px] font-montserrat ${
          data.feature ? "text-white" : "text-[#313234]"
        }`}
      >
        <span className="text-lg">&ldquo;</span>
        {data.review}
        <span className="text-lg">&rdquo;</span>
      </blockquote>
      <div className="flex gap-7 items-center ">
        <div className="w-[52px] h-[52px] shrink-0 border rounded-full flex items-center justify-center">
          <Image
            className="rounded-[38px] w-[38px] h-[38px] "
            src={data.profile}
            width={38}
            height={38}
            alt="ryan"
          />
        </div>
        <div className="">
          <h3
            className={` text-xl not-italic font-medium leading-[normal] font-montserrat ${
              data.feature ? "text-white" : "text-[#25262B]"
            }`}
          >
            {data.name}
          </h3>
          <p
            className={` text-base not-italic font-medium leading-[normal] font-montserrat ${
              data.feature ? "text-white" : "text-[#555F68]"
            }`}
          >
            {data.designation}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestTimonialCard;
