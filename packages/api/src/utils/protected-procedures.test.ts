import { TRPCError } from "@trpc/server";
import { getRandomId, pick } from "@answeroverflow/utils";
import { z } from "zod";
import {
	protectedFetchManyWithPublicData,
	protectedFetchWithPublicData,
	protectedMutation
} from "./protected-procedures";

const zSampleData = z.object({
	id: z.number(),
	name: z.string(),
	email: z.string(),
	password: z.string()
});

const zPublicSampleData = zSampleData.pick({
	id: true,
	name: true
});

const sampleData: z.infer<typeof zSampleData> = {
	id: parseInt(getRandomId()),
	name: "test",
	email: "hello",
	password: "world"
};

describe("Protected Fetch", () => {
	it("should succeed with 1 permission check", async () => {
		const data = await protectedFetchWithPublicData({
			fetch: () => Promise.resolve(sampleData),
			permissions: () => {},
			publicDataFormatter: (data) => zPublicSampleData.parse(data),
			notFoundMessage: "not found"
		});

		expect(data).toEqual(sampleData);
	});
	it("should succeed getting public data", async () => {
		const data = await protectedFetchWithPublicData({
			fetch: () => Promise.resolve(sampleData),
			permissions: () => new TRPCError({ code: "UNAUTHORIZED" }),
			publicDataFormatter: (data) => zPublicSampleData.parse(data),
			notFoundMessage: "not found"
		});
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { email, password, ...publicData } = sampleData;
		expect(data).toEqual(publicData);
	});
	it("should format an array of public data", async () => {
		const data = await protectedFetchManyWithPublicData({
			fetch: () => Promise.resolve([sampleData]),
			permissions: () => new TRPCError({ code: "UNAUTHORIZED" }),
			publicDataFormatter: (data) => zPublicSampleData.parse(data)
		});
		const publicData = pick(sampleData, ["id", "name"]);
		expect(data).toEqual([publicData]);
	});
});

describe("Protected Mutation", () => {
	it("should succeed with 1 permission check", async () => {
		const data = await protectedMutation({
			operation() {
				return Promise.resolve(sampleData);
			},
			permissions: () => {}
		});
		expect(data).toEqual(sampleData);
	});
	it("should fail a permission check", async () => {
		await expect(
			protectedMutation({
				operation() {
					return Promise.resolve(sampleData);
				},
				// For people watching the stream, I forgot to throw the error im just creating it lol
				permissions: () => new TRPCError({ code: "UNAUTHORIZED" })
			})
		).rejects.toThrowError();
	});
});
