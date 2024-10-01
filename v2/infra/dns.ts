export const domain =
  {
    production: "answeroverflow.com",
    dev: "dev.answeroverflow.com",
  }[$app.stage] || $app.stage + ".dev.answeroverflow.com";
export const zone = cloudflare.getZoneOutput({
  name: "answeroverflow.com",
});

export const shortDomain = domain.replace(/terminal\.shop$/, "trm.sh");

export const shortZone = cloudflare.getZoneOutput({
  name: "trm.sh",
});