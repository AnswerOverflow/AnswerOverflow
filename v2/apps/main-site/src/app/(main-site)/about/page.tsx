import { metadata as baseMetadata } from "../layout";
import { Metadata } from "next";

import { HowDoesItWorkArea } from "../_components/HowDoesItWorkArea";
import { Footer } from "@answeroverflow/ui/footer";
import { PricingOptions } from "@answeroverflow/ui/pricing";
import { Navbar } from "@answeroverflow/ui/navbar/index";

import { FeaturedCommunitiesSection } from "@answeroverflow/ui/pages/home/FeaturedCommunities";
import { FeaturesSection } from "@answeroverflow/ui/pages/home/Features";

export const metadata: Metadata = {
  title: "Index Your Discord Content Into Google - Answer Overflow",
  description:
    "Learn about how you can index Discord channels into Google search results with Answer Overflow.",
  openGraph: {
    ...baseMetadata.openGraph,
    title: "Index Your Discord Content Into Google - Answer Overflow",
    description:
      "Learn about how you can index Discord channels into Google search results with Answer Overflow.",
  },
};

export default function Page() {
  return (
    <div className={"mx-auto max-w-screen-3xl"}>
      <Navbar tenant={undefined} />

      <HowDoesItWorkArea />
      <div className="flex flex-col items-center px-4 pb-20 pt-10 sm:px-[4rem] 2xl:px-[6rem]">
        <FeaturesSection />
        <div className={"mt-20 w-full"}>
          <PricingOptions />
        </div>
        <FeaturedCommunitiesSection className="pt-20" />
      </div>
      <Footer tenant={undefined} />
    </div>
  );
}
