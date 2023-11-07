// contentlayer has issues in monorepos, this allows us to build it from the root postinstall script
import { config } from './contentlayer.config';
import { makeSource } from 'contentlayer/source-files';
export default makeSource({
	...config,
	contentDirPath: './apps/main-site/src/content',
});
