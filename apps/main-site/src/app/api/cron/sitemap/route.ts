import { generateSitemap } from '@answeroverflow/core/sitemap';
import { sharedEnvs } from '@answeroverflow/env/shared';

export async function GET() {
	if (sharedEnvs.NODE_ENV !== 'production') {
		await generateSitemap();
		return new Response('Sitemap generated');
	}
	return new Response('Sitemap generation is only available in dev');
}
