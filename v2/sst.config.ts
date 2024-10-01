/// <reference path="./.sst/platform/config.d.ts" />
import { readdirSync } from "fs";

// const discordToken = new sst.Secret("DISCORD_TOKEN");
export default $config({
  app(input) {
    return {
      name: "v2",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    $transform(cloudflare.WorkerScript, (script) => {
      script.logpush = true;
    });
    sst.Linkable.wrap(cloudflare.Record, function (record) {
      return {
        properties: {
          url: $interpolate`https://${record.name}`,
        },
      };
    });
    const outputs = {};
    for (const value of readdirSync("./infra/")) {
      const result = await import("./infra/" + value);
      if (result.outputs) Object.assign(outputs, result.outputs);
    }
    return outputs;
  },
});
