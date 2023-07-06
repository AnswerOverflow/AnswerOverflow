import type { Story } from '@ladle/react';
import { SearchBar, type SearchBarProps } from './SearchBar';

const Primary: Story<SearchBarProps> = (props) => <SearchBar {...props} />;
Primary.args = {
	placeholder: 'Search for anything',
};
