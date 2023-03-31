import type { ChannelWithFlags } from '@answeroverflow/db';
import type { ClientEvents } from 'discord.js';
import type { Subject } from 'rxjs';

type AOEvent<E extends keyof ClientEvents, D extends {} = {}> = {
	raw: ClientEvents[E];
} & D;

export type AOEvents = {
	messageCreate: AOEvent<
		'messageCreate',
		{ channelSettings: ChannelWithFlags }
	>;
	clientReady: AOEvent<'clientReady'>;
};

// ☭
type AOUnion = {
	[K in keyof AOEvents]: { action: K; data: AOEvents[K] };
}[keyof AOEvents];

export type AOEventSubject = Subject<AOUnion>;
