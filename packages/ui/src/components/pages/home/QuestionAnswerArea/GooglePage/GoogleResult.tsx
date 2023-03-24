import { forwardRef } from 'react';
import type { GooglePageProps } from './GooglePage';

export const GoogleResult = forwardRef<
	HTMLDivElement,
	GooglePageProps['result']
>(function GoogleResultComp({ url, title, description }, ref) {
	return (
		<div className="flex flex-col items-start justify-center px-5 font-['arial']">
			<div className="group">
				<div className="flex w-full flex-row items-center justify-start">
					<span className="text-[14px] text-[#bdc1c6]">{url}</span>
					<div className="ml-[12px] h-[22px] w-[22px]" aria-hidden>
						<svg
							focusable="false"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="#9aa0a6"
						>
							<path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path>
						</svg>
					</div>
				</div>
				<div ref={ref}>
					<h3 className="mb-[3px] pt-[5px] text-[20px] text-[#8ab4f8]">
						{title}
					</h3>
				</div>
			</div>
			<p className="text-[14px] leading-[1.58] text-[#bdc1c6]">{description}</p>
		</div>
	);
});
