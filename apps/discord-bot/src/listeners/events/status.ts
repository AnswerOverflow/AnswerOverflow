import { ApplyOptions } from "@sapphire/decorators";
import { Listener, SapphireClient } from "@sapphire/framework";
import { ActivityType, Events } from "discord.js";

const minutesBetweenSwitches = 0.25;

//add messages in the form ['<message body>', ActivityType.<your type>]
const messages: [
  string,
  (
    | ActivityType.Playing
    | ActivityType.Streaming
    | ActivityType.Listening
    | ActivityType.Watching
    | ActivityType.Competing
  )
][] = [
  [" X communities!", ActivityType.Watching],
  [" over X questions!", ActivityType.Listening],
  [" with something I need ideas", ActivityType.Playing],
  [" hell idk", ActivityType.Streaming],
];

function newStatus(client: SapphireClient) {
  const time = new Date().getSeconds();
  const index = Math.round(time / (60 * minutesBetweenSwitches));
  const message = messages[index];
  if (message != undefined) {
    client.user?.setActivity(message[0], { type: message[1] });
  }
}

@ApplyOptions<Listener.Options>({ event: Events.ClientReady })
export class StartStatusLoop extends Listener<typeof Events.ClientReady> {
  public run(client: SapphireClient) {
    setInterval(newStatus, 60 * minutesBetweenSwitches * 1000, client);
  }
}
