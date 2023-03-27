import { ApplyOptions } from "@sapphire/decorators";
import { Listener, SapphireClient } from "@sapphire/framework";
import { ActivityOptions, ActivityType, Events } from "discord.js";

type StatusUpdate = {
  getStatus: (() => Promise<string> | string) | string;
} & ActivityOptions;

function getStatuses(client: SapphireClient) {
  const statuses: StatusUpdate[] = [
      { 
        getStatus: () => `${client.guilds.cache.size} communities.`, 
        type: ActivityType.Watching, 
      },
      {
          type: ActivityType.Listening,
          async getStatus() {
              const messageCount = 10; //await getNumberOfIndexedMessages();
              return ` to ${messageCount} messages`;
          },
      },
      {
          type: ActivityType.Watching,
          getStatus: 'hello',
      },
  ];
  return statuses;
}
 
@ApplyOptions<Listener.Options>({ event: Events.ClientReady })
export class SendMarkSolutionInstructionsOnThreadCreate extends Listener {
  public async run() {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      setInterval(async () => {
          const statuses = getStatuses(this.container.client);
          //const status = statuses[Math.floor(Math.random() * statuses.length)]!;
          var index = Math.floor((new Date().getSeconds())/60 * statuses.length);
          const status = statuses[index]!;
    const statusText = typeof status.getStatus === 'string' ? status.getStatus : await status.getStatus();
          this.container.client.user?.setActivity(statusText, {
              type: status.type,
          });
      }, 1000 * 15)}};