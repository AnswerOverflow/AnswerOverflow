import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { Paragraph } from '../ui/paragraph';
import { Button } from '../ui/button';
import { LinkButton } from '../ui/link-button';

export interface AttachmentDownloaderProps {
	url: string;
	filename: string;
}

export const AttachmentDownloader = (props: AttachmentDownloaderProps) => {
	const fileNameTruncated =
		props.filename.length > 20
			? props.filename.substring(0, 20) + '...'
			: props.filename;

	return (
		<LinkButton
			className="flex flex-row items-center justify-start"
			variant="outline"
			href={props.url}
		>
			<Paragraph className="py-0">{fileNameTruncated}</Paragraph>
			{/* Download icon */}
			<ArrowDownTrayIcon className="ml-auto h-5 w-5" />
		</LinkButton>
	);
};
