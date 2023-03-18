import { ApplyOptions } from "@sapphire/decorators";
import type { Listener, SapphireClient } from "@sapphire/framework";
import { Activity, ActivityType, Events, User } from "discord.js";
import { container } from "@sapphire/framework";

let minutes_between_switches = .25

let messages: [string, ActivityType.Playing | ActivityType.Streaming | ActivityType.Listening | ActivityType.Watching | ActivityType.Competing][] = [
    [' X communities!', ActivityType.Watching],
    [' over X questions!', ActivityType.Listening],
    [' with something I need ideas', ActivityType.Playing],
    [' hell idk', ActivityType.Streaming]
]

function newStatus(){
    let time = new Date().getSeconds();
    let index = Math.round(time/(60*minutes_between_switches))
    let message = messages[index]
    if((message != undefined)){
        let x = message[1]
        container.client.user?.setActivity(message[0], {type: message[1]})
    }    
}

container.client.once(Events.ClientReady, c=>{
    let timing = (60*minutes_between_switches)*1000
    setInterval(newStatus, (60*minutes_between_switches)*1000)
})
