import { findServerWithCommunityPageData } from "@answeroverflow/core/pages";
import { notFound, redirect } from "next/navigation";
import { sharedEnvs } from "@answeroverflow/env/shared";
import { CommunityPage } from "@answeroverflow/ui/pages/CommunityPage";
import { z } from "zod";

export { generateMetadata } from "../page";

export default async function CommunityChannelPage({
  params,
  searchParams,
}: {
  params: { communityId: string; channelId: string };
  searchParams: {
    page: string | undefined;
    uwu?: string | undefined;
  };
}) {
  const page = z.coerce.number().parse(searchParams.page ?? "0");
  if (searchParams.page && page === 0) {
    return redirect(`/c/${params.communityId}/${params.channelId}`);
  }
  const communityPageData = await findServerWithCommunityPageData({
    idOrVanityUrl: params.communityId,
    selectedChannel: params.channelId,
    page: page,
  });
  if (!communityPageData || communityPageData.server.kickedTime != null) {
    return notFound();
  }
  if (communityPageData.server.customDomain) {
    return redirect(
      `http${sharedEnvs.NODE_ENV === "production" ? "s" : ""}://${
        communityPageData.server.customDomain
      }`
    );
  }
  const selectedChannel = communityPageData.channels.find(
    (channel) => channel.id === params.channelId
  );
  if (!selectedChannel) {
    return notFound();
  }
  const uwu = !!searchParams.uwu;

  return (
    <CommunityPage
      {...communityPageData}
      selectedChannel={selectedChannel}
      uwu={uwu}
      tenant={undefined}
      page={page}
    />
  );
}
