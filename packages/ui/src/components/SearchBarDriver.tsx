import { useRouter } from "next/router";
import { SearchBar, SearchBarProps } from "./SearchBar";

export function SearchBarDriver(props: SearchBarProps) {
  const router = useRouter();
  const { search: search_query } = router.query;
  const search = search_query ? search_query.toString() : "";
  return <SearchBar {...props} default_value={props.default_value ?? search} />;
}
