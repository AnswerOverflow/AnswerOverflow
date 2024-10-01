import { domain } from "./dns";

export const mainSite = new sst.aws.Astro("Site", {
  domain: {
    name: "www." + domain,
    dns: sst.cloudflare.dns(),
  },
  path: "./packages/www",
  link: [],
});

export const outputs = {
  www: mainSite.url,
};