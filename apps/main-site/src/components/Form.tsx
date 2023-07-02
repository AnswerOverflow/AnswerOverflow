import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import DomainStatus from './domain-status';
import DomainConfiguration from './domain-configuration';

export default function Form({
	title,
	description,
	helpText,
	inputAttrs,
	handleSubmit,
}: {
	title: string;
	description: string;
	helpText: string;
	inputAttrs: {
		name: string;
		type: string;
		defaultValue: string;
		placeholder?: string;
		maxLength?: number;
		pattern?: string;
	};
	handleSubmit: any;
}) {
	const router = useRouter();
	const { update } = useSession();
	return (
		<form
			action={async (data: FormData) => {
				if (
					inputAttrs.name === 'customDomain' &&
					inputAttrs.defaultValue &&
					data.get('customDomain') !== inputAttrs.defaultValue &&
					!confirm('Are you sure you want to change your custom domain?')
				) {
					return;
				}
				handleSubmit(data, inputAttrs.name).then(async (res: any) => {
					if (res.error) {
						toast.error(res.error);
					} else {
						await update();
						router.refresh();

						toast.success(`Successfully updated ${inputAttrs.name}!`);
					}
				});
			}}
			className="rounded-lg border border-stone-200 bg-white"
		>
			<div className="relative flex flex-col space-y-4 p-5 sm:p-10">
				<h2 className="font-cal text-xl">{title}</h2>
				<p className="text-sm text-stone-500">{description}</p>

				<div className="relative flex w-full max-w-md">
					<input
						{...inputAttrs}
						className="z-10 flex-1 rounded-md border border-stone-300 text-sm text-stone-900 placeholder-stone-300 focus:border-stone-500 focus:outline-none focus:ring-stone-500"
					/>
					{inputAttrs.defaultValue && (
						<DomainStatus domain={inputAttrs.defaultValue} />
					)}
				</div>
			</div>
			{inputAttrs.name === 'customDomain' && inputAttrs.defaultValue && (
				<DomainConfiguration domain={inputAttrs.defaultValue} />
			)}
			<div className="flex flex-col items-center justify-center space-y-2 rounded-b-lg border-t border-stone-200 bg-stone-50 p-3 sm:flex-row sm:justify-between sm:space-y-0 sm:px-10">
				<p className="text-sm text-stone-500">{helpText}</p>
			</div>
		</form>
	);
}
