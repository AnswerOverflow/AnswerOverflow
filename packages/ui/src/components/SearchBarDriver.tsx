import { useRouter } from "next/router";
import { SearchBar, SearchBarProps } from "./SearchBar";

export function SearchBarDriver(props: SearchBarProps) {
	const router = useRouter();
	const { search: searchQuery } = router.query;
	const search = searchQuery ? searchQuery.toString() : "";
	return <SearchBar {...props} defaultValue={props.defaultValue ?? search} />;
}
