import { ApplyOptions } from "@sapphire/decorators";
import { Listener, SapphireClient } from "@sapphire/framework";
import { ActivityOptions, ActivityType, Events } from "discord.js";

type StatusUpdate = {
  getStatus: (() => Promise<string> | string) | string;
} & ActivityOptions;

function getStatuses(client: SapphireClient) {
  const statuses: StatusUpdate[] = [
      { 
        type: ActivityType.Watching,
        getStatus: () => `${client.guilds.cache.size} communities.`, 
      },
      {
          type: ActivityType.Listening,
          async getStatus() {
              const messageCount = 10; //await getNumberOfIndexedMessages();
              return ` to ${messageCount} messages`;
          },
      },
      {
          type: ActivityType.Playing,
          getStatus: 'Open Source! github.com/AnswerOverflow',
      },
      {
        type: ActivityType.Playing,
        getStatus: 'Placeholder4',
      },
      {
        type: ActivityType.Playing,
        getStatus: 'Placeholder5',
      },
      {
        type: ActivityType.Playing,
        getStatus: 'Placeholder6',
      },
  ];
  return statuses;
}
 
@ApplyOptions<Listener.Options>({ event: Events.ClientReady })
export class SendMarkSolutionInstructionsOnThreadCreate extends Listener {
  public async run() {
      setInterval(async () => {
          const statuses = getStatuses(this.container.client);
          var index = Math.floor(((new Date().getHours())%6)/6 * statuses.length);
          console.log(new Date().getHours());
          console.log(index);
          const status = statuses[index]!;
    const statusText = typeof status.getStatus === 'string' ? status.getStatus : await status.getStatus();
          this.container.client.user?.setActivity(statusText, {
              type: status.type,
          });
      }, 10000 * 60)}};