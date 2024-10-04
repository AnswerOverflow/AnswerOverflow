'use client';

export function CarbonAds() {
	return (
		// TODO: Maybe have a "hey disable ad blocker" message here?
		<div
			className={'w-full text-white'}
			// NextJS is dumb and lifts script tags to <head/> so we have to use dangerouslySetInnerHTML
			dangerouslySetInnerHTML={{
				__html:
					'<script\n' +
					'async\n' +
					'type="text/javascript"\n' +
					// set parent display to none if ad fails to load
					'onerror="this.parentElement.style.display = \'none\'"\n' +
					'src="//cdn.carbonads.com/carbon.js?serve=CWYIV53I&placement=wwwansweroverflowcom&format=cover"\n' +
					'id="_carbonads_js"\n' +
					'></script>' +
					'',
			}}
		/>
	);
}
