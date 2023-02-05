import { addFlagsToUserServerSettings } from "./zod-schemas";

describe("Channel Settings", () => {
  describe("Add Flags To Channel Settings", () => {
    it("should add flags to channel settings", () => {
      const data = addFlagsToUserServerSettings({
        bitfield: 0,
        server_id: "server_id",
        user_id: "user_id",
      });
      expect(data.flags.can_publicly_display_messages).toBe(false);
      expect(data.flags.message_indexing_disabled).toBe(false);
    });
  });
});
