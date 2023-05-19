// terrible file name

import type { ServerPublic } from '@answeroverflow/api';

// TODO: Handle this at the API level
export function getServerDescription(server: ServerPublic) {
	return (
		server.description ?? `Join the ${server.name} server to ask questions!`
	);
}

export const getImageHeightWidth = async ({
	imageSrc,
}: {
	imageSrc: string;
}) => {
	return new Promise<{
		width: number;
		height: number;
	}>((resolve, reject) => {
		const img = new window.Image();
		img.src = imageSrc;
		img.onload = () => {
			resolve({ width: img.width, height: img.height });
		};
		img.onerror = (event) => {
			reject(event);
		};
	});
};
