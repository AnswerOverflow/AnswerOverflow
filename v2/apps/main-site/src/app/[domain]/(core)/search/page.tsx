import { SearchPage } from "@answeroverflow/ui/pages/SearchPage";
import { callAPI } from "@answeroverflow/ui/utils/trpc";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { findServerByCustomDomain } from "@answeroverflow/core/server";
type Props = {
  searchParams: {
    q?: string | string[];
  };
};

export function generateMetadata({ searchParams }: Props): Metadata {
  const query = searchParams.q ? (searchParams.q as string) : undefined;
  return {
    title: query ? `Search Results for "${query}"` : "Search - Answer Overflow",
    openGraph: {
      title: query
        ? `Search Results for "${query}"`
        : "Search - Answer Overflow",
    },
  };
}

export default async function Search(props: {
  searchParams: {
    q?: string | string[];
  };
  params: {
    domain: string;
  };
}) {
  const server = await findServerByCustomDomain(
    decodeURIComponent(props.params.domain)
  );
  if (!server) {
    return notFound();
  }
  if (!props.searchParams.q) {
    return <SearchPage results={[]} tenant={server} />;
  }

  const results = await callAPI({
    apiCall: (api) =>
      api.messages.search({
        serverId: server.id,
        query: props.searchParams.q ? (props.searchParams.q as string) : "",
      }),
  });
  return <SearchPage results={results} tenant={server} />;
}
