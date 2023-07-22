import { Home } from './Home';
import { mockServer } from '~ui/test/props';

const servers = Array.from({ length: 65 }, () => mockServer());

export const HomeStory = () => <Home servers={servers} />;
