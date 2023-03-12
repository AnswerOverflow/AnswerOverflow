import { CheckIcon } from "@heroicons/react/24/outline";

const pricing = {
	tiers: [
		{
			title: "Free",
			description: "The essentials to provide your best work for clients.",
			features: ["Hosting on answeroverflow.com", "Basic analytics"],
			cta: "Setup Now",
			mostPopular: false
		},
		{
			title: "Enterprise",
			description: "A plan that scales with your rapidly growing business.",
			features: [
				"Host on your own domain",
				"Advanced analytics",
				"Premium Support",
				"Automated updates"
			],
			cta: "Join The Waitlist",
			mostPopular: true
		},
		{
			title: "Self Host",
			description: "Host your own instance of Answer Overflow.",
			features: ["Own your data"],
			cta: "Self Host Instructions",
			mostPopular: false
		}
	]
};

function classNames(...classes: string[]) {
	return classes.filter(Boolean).join(" ");
}

export function Pricing() {
	return (
		<div className="mx-auto max-w-7xl bg-white py-24 px-6 lg:px-8">
			<h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl sm:leading-none lg:text-6xl">
				Pricing plans for teams of all sizes
			</h2>
			<p className="mt-6 max-w-2xl text-xl text-gray-500">
				Choose an affordable plan that &apos s packed with the best features for engaging
				your audience, creating customer loyalty, and driving sales.
			</p>

			{/* Tiers */}
			<div className="mt-24 space-y-12 lg:grid lg:grid-cols-3 lg:gap-x-8 lg:space-y-0">
				{pricing.tiers.map((tier) => (
					<div
						key={tier.title}
						className={classNames(
							"relative flex flex-col rounded-2xl border border-gray-200 bg-white p-8 shadow-sm",
							tier.mostPopular ? "border-yellow-200 drop-shadow-2xl" : ""
						)}
					>
						<div className="flex-1">
							<h3 className="text-xl font-semibold text-gray-900">{tier.title}</h3>

							<p className="mt-6 text-gray-500">{tier.description}</p>

							{/* Feature list */}
							<ul role="list" className="mt-6 space-y-6">
								{tier.features.map((feature) => (
									<li key={feature} className="flex">
										<CheckIcon
											className="h-6 w-6 shrink-0 text-indigo-500"
											aria-hidden="true"
										/>
										<span className="ml-3 text-gray-500">{feature}</span>
									</li>
								))}
							</ul>
						</div>

						<a
							href="#"
							className={classNames(
								tier.mostPopular
									? "bg-indigo-600 text-white hover:bg-indigo-700"
									: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
								"mt-8 block w-full rounded-md border border-transparent py-3 px-6 text-center font-medium"
							)}
						>
							{tier.cta}
						</a>
					</div>
				))}
			</div>
		</div>
	);
}
