import {
	Story,
	StoryDefault,
} from '@ladle/react/typings-for-build/app/exports';
import { ConfigureDomainCardRenderer } from '~ui/components/dashboard/domains';

export default {
	title: 'Dashboard / Cards / Configure Domain',
} satisfies StoryDefault;
export const NoInput: Story = () => (
	<ConfigureDomainCardRenderer
		enabled={true}
		id={'1'}
		currentDomain={null}
		fetching={false}
	/>
);

export const InvalidDomain: Story = () => (
	<ConfigureDomainCardRenderer
		enabled={true}
		id={'1'}
		currentDomain={'https://google.com'}
		fetching={false}
	/>
);

export const CorrectlyConfigured: Story = () => (
	<ConfigureDomainCardRenderer
		enabled={true}
		id={'1'}
		currentDomain={'support.trpc.io'}
		fetching={false}
		status={'Valid Configuration'}
		domainJson={{
			apexName: 'support.trpc.io',
			projectId: '1',
			name: 'support',
			verification: [
				{
					domain: 'support.trpc.io',
					reason: 'CNAME',
					type: 'CNAME',
					value: 'google-site-verification=123',
				},
			],
			verified: true,
			error: {
				code: '200',
				message: 'OK',
			},
		}}
	/>
);

export const APending: Story = () => (
	<ConfigureDomainCardRenderer
		enabled={true}
		id={'1'}
		currentDomain={'trpc.io'}
		fetching={false}
		status={'Pending Verification'}
		domainJson={{
			apexName: 'trpc.io',
			projectId: '1',
			name: 'trpc.io',
			verification: [
				{
					domain: 'trpc.io',
					reason: 'CNAME',
					type: 'CNAME',
					value: 'google-site-verification=123',
				},
			],
			verified: true,
			error: {
				code: '200',
				message: 'OK',
			},
		}}
	/>
);

export const CNAMEPending: Story = () => (
	<ConfigureDomainCardRenderer
		enabled={true}
		id={'1'}
		currentDomain={'support.trpc.io'}
		fetching={false}
		status={'Pending Verification'}
		domainJson={{
			apexName: 'support.trpc.io',
			projectId: '1',
			name: 'trpc.io',
			verification: [
				{
					domain: 'support.trpc.io',
					reason: 'CNAME',
					type: 'CNAME',
					value: 'google-site-verification=123',
				},
			],
			verified: true,
			error: {
				code: '200',
				message: 'OK',
			},
		}}
	/>
);
