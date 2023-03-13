import { EmbedBuilder, ThreadChannel } from "discord.js"
import { findChannelById } from "@answeroverflow/db"

const sendMarkSolutionInstructionsErrorReasons = [
  'Thread was not newly created',
  'Thread does not have a parent channel',
  'Channel not found',
  'Channel does not have sendMarkSolutionInstructionsInNewThreads flag set',
] as const

export type SendMarkSolutionInstructionsErrorReason = typeof sendMarkSolutionInstructionsErrorReasons[number]

export class SendMarkSolutionInstructionsError extends Error {
  constructor(reason: SendMarkSolutionInstructionsErrorReason) {
    super(reason)
  }
}

export async function sendMarkSolutionInstructionsInThread(
  thread: ThreadChannel,
  newlyCreated: boolean
) {
  if (!newlyCreated) {
    throw new SendMarkSolutionInstructionsError(
      'Thread was not newly created'
    )
  }
  if (!thread.parentId) {
    throw new SendMarkSolutionInstructionsError(
      'Thread does not have a parent channel'
    )
  }
  const channel = await findChannelById(
    thread.parentId
  )
  if (!channel) {
    throw new SendMarkSolutionInstructionsError(
      'Channel not found'
    )
  }
  if (!channel.flags.sendMarkSolutionInstructionsInNewThreads) {
    throw new SendMarkSolutionInstructionsError(
      'Channel does not have sendMarkSolutionInstructionsInNewThreads flag set'
    )
  }
  const markSolutionInstructionsEmbed = new EmbedBuilder().setDescription(`To help others find answers, you can mark your question as solved via \`Right click solution message -> Apps -> ✅ Mark Solution\``).setImage('https://cdn.discordapp.com/attachments/1020132770862874704/1025906507549790208/mark_solution_instructions.png')
  await thread.send({
    embeds: [markSolutionInstructionsEmbed],
  })
}
