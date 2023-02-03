import { TRPCError } from "@trpc/server";
import { getRandomId, pick } from "@answeroverflow/utils";
import { z } from "zod";
import {
  protectedFetchManyWithPublicData,
  protectedFetchWithPublicData,
  protectedMutation,
} from "./protected-procedures";

const z_sample_data = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  password: z.string(),
});

const z_public_sample_data = z_sample_data.pick({
  id: true,
  name: true,
});

const sample_data: z.infer<typeof z_sample_data> = {
  id: parseInt(getRandomId()),
  name: "test",
  email: "hello",
  password: "world",
};

describe("Protected Fetch", () => {
  it("should succeed with 1 permission check", async () => {
    const data = await protectedFetchWithPublicData({
      fetch: () => Promise.resolve(sample_data),
      permissions: () => {},
      public_data_formatter: (data) => z_public_sample_data.parse(data),
      not_found_message: "not found",
    });

    expect(data).toEqual(sample_data);
  });
  it("should succeed getting public data", async () => {
    const data = await protectedFetchWithPublicData({
      fetch: () => Promise.resolve(sample_data),
      permissions: () => new TRPCError({ code: "UNAUTHORIZED" }),
      public_data_formatter: (data) => z_public_sample_data.parse(data),
      not_found_message: "not found",
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { email, password, ...public_data } = sample_data;
    expect(data).toEqual(public_data);
  });
  it("should format an array of public data", async () => {
    const data = await protectedFetchManyWithPublicData({
      fetch: () => Promise.resolve([sample_data]),
      permissions: () => new TRPCError({ code: "UNAUTHORIZED" }),
      public_data_formatter: (data) => z_public_sample_data.parse(data),
    });
    const public_data = pick(sample_data, ["id", "name"]);
    expect(data).toEqual([public_data]);
  });
});

describe("Protected Mutation", () => {
  it("should succeed with 1 permission check", async () => {
    const data = await protectedMutation({
      operation() {
        return Promise.resolve(sample_data);
      },
      permissions: () => {},
    });
    expect(data).toEqual(sample_data);
  });
  it("should fail a permission check", async () => {
    await expect(
      protectedMutation({
        operation() {
          return Promise.resolve(sample_data);
        },
        // For people watching the stream, I forgot to throw the error im just creating it lol
        permissions: () => new TRPCError({ code: "UNAUTHORIZED" }),
      })
    ).rejects.toThrowError();
  });
});
