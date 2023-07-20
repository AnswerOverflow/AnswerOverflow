import {
	addFlagsToServer,
	bitfieldToServerFlags,
	type Server,
} from '@answeroverflow/prisma-types';
import { mockServer } from '@answeroverflow/db-mock';
import {
	createServer,
	findServerByAlias,
	findServerById,
	updateServer,
} from './server';
import { getRandomId } from '@answeroverflow/utils';

let server: Server;

beforeEach(() => {
	server = mockServer();
});

describe('Server', () => {
	describe('Create Server', () => {
		it('should create server settings with read the rules consent enabled', async () => {
			// setup
			const created = await createServer({
				...server,
				flags: {
					readTheRulesConsentEnabled: true,
				},
			});
			expect(created.flags.readTheRulesConsentEnabled).toBe(true);
			const found = await findServerById(server.id);
			expect(found!.flags.readTheRulesConsentEnabled).toBe(true);
		});
		it("should fail if creating a server with an alais the same as an existing server's id", async () => {
			const existing = await createServer(server);
			const newServer = mockServer({ vanityUrl: existing.id });
			await expect(createServer(newServer)).rejects.toThrow();
		});
	});
	describe('Update Server', () => {
		let existing: Server;
		beforeEach(async () => {
			existing = await createServer(server);
		});
		it('should update server with consent enabled enable', async () => {
			const updated = await updateServer({
				update: {
					...server,
					flags: {
						readTheRulesConsentEnabled: true,
					},
				},
				existing,
			});
			expect(updated.flags.readTheRulesConsentEnabled).toBe(true);
			const found = await findServerById(server.id);
			expect(found!.flags.readTheRulesConsentEnabled).toBe(true);
		});
	});
	describe('Find Server By Id', () => {
		let existing: Server;
		beforeEach(async () => {
			existing = await createServer(server);
		});
		it('should find server by id', async () => {
			const found = await findServerById(server.id);
			expect(found).toStrictEqual(existing);
		});
		it('should return null if server not found', async () => {
			const found = await findServerById('not-found');
			expect(found).toBeNull();
		});
	});
	describe('Find by alias', () => {
		it('should find server by alias', async () => {
			const serverWithAlias = mockServer({ vanityUrl: getRandomId() });
			await createServer(serverWithAlias);
			const found = await findServerByAlias(serverWithAlias.vanityUrl!);
			expect(found).toStrictEqual(addFlagsToServer(serverWithAlias));
		});
		it('should return null if server not found', async () => {
			const found = await findServerByAlias('not-found');
			expect(found).toBeNull();
		});
	});
	describe('Upsert Server', () => {
		it('should upsert create a server', async () => {
			const created = await createServer(server);
			expect(created).toEqual(addFlagsToServer(server));
		});
		it('should upsert update a server', async () => {
			const created = await createServer(server);
			const updated = await updateServer({
				update: {
					...server,
					flags: {
						readTheRulesConsentEnabled: true,
					},
				},
				existing: created,
			});
			expect(updated.flags.readTheRulesConsentEnabled).toBe(true);
		});
	});
});

describe('Server flags', () => {
	it('should enable read the rules consent correctly', () => {
		expect(
			bitfieldToServerFlags(1 << 0).readTheRulesConsentEnabled,
		).toBeTruthy();
	});
	it('should disable read the rules consent correctly', () => {
		expect(bitfieldToServerFlags(0).readTheRulesConsentEnabled).toBeFalsy();
	});
	it('should enable consider all messages public correctly', () => {
		expect(
			bitfieldToServerFlags(1 << 1).considerAllMessagesPublic,
		).toBeTruthy();
	});
	it('should disable consider all messages public correctly', () => {
		expect(bitfieldToServerFlags(0).considerAllMessagesPublic).toBeFalsy();
	});
});
