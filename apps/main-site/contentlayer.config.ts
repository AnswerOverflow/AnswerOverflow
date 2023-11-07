import {
	defineDocumentType,
	makeSource,
	ComputedFields,
} from 'contentlayer/source-files';

const computedFields: ComputedFields = {
	slug: {
		type: 'string',
		resolve: (doc) => `/${doc._raw.flattenedPath}`,
	},
	slugAsParams: {
		type: 'string',
		resolve: (doc) => doc._raw.flattenedPath.split('/').slice(1).join('/'),
	},
};
export const Changelog = defineDocumentType(() => ({
	name: 'Changelog',
	filePathPattern: `changelog/**/*.mdx`,
	contentType: 'mdx',
	fields: {
		title: {
			type: 'string',
			required: true,
		},
		description: {
			type: 'string',
		},
		date: {
			type: 'date',
			required: true,
		},
		showInBanner: {
			type: 'boolean',
			required: false,
			default: false,
		},
		bannerText: {
			type: 'string',
			required: false,
		},
	},
	computedFields,
}));

export default makeSource({
	contentDirPath: './src/content',
	documentTypes: [Changelog],
});
