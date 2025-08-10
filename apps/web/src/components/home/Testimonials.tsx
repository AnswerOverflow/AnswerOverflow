import Image from "next/image";
import TestTimonialCard from "../common/TestTimonialCard";

const TestimonialsData = [
  {
    rating: 5,
    review:
      "Great note-taking application! The AI features make note-taking a breeze",
    name: "Ryan Lowry",
    designation: "Engineer & Author",
    profile: "/images/profile.png",
    feature: false,
  },
  {
    rating: 5,
    review:
      "Really like the clean design of UseNotes. The AI-driven search is impressively accurate, adding a personal dimension to my notes. Fast and very easy to use.",
    name: "John Collins",
    designation: "Engineer & Author",
    profile: "/images/profile.png",
    feature: true,
  },
  {
    rating: 5,
    review: "Simply brilliant! UseNotes has elevated my productivity.",
    name: "Moe Partuj",
    designation: "Student",
    profile: "/images/Moe-Partuj.jpeg",
    feature: false,
  },
];

const Testimonials = () => {
  return (
    <section
      id="reviews"
      className="bg_image bg_circle relative overflow-hidden"
    >
      <Image
        src={"/images/blue-circle-right.svg"}
        width={503}
        height={531}
        alt=""
        className="absolute hidden sm:block -right-40 top-1/4 h-[531px]"
      />
      <div className="container py-11 sm:py-16 px-6 sm:px-0">
        <p className="text-black text-[17px] sm:text-3xl not-italic font-medium leading-[90.3%] tracking-[-0.75px] text-center font-montserrat pb-2 sm:pb-[18px]">
          Reviews
        </p>
        <h3 className=" text-black text-3xl sm:text-[57px] not-italic font-medium leading-[90.3%] tracking-[-1.425px] font-montserrat text-center pb-[20px] sm:pb-[87px]">
          User Testimonials
        </h3>

        <div className="flex flex-wrap md:flex-nowrap justify-center items-start gap-4 pb-10 mb-10 relative">
          <Image
            src={"/images/message-left.svg"}
            width={110}
            height={102}
            alt=""
            className="absolute hidden md:block left-0 top-full"
          />
          <Image
            src={"/images/message-right.svg"}
            width={110}
            height={102}
            alt=""
            className="absolute hidden md:block right-0 bottom-full"
          />
          {TestimonialsData.map((item, index) => (
            <TestTimonialCard data={item} key={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
