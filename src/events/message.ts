/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    Events,
    Message,
    MessageCreateOptions,
    BaseButtonComponentData,
    ButtonInteraction,
    TextChannel,
    ButtonBuilder,
} from 'discord.js'
import { EventHandler, Frank } from 'structs/discord'
import { Button } from 'enums'

const submissionHandler: EventHandler<Message> = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return
        if (!message.channel.isDMBased()) return

        const frank = message.client as Frank

        const components = frank.utils.submissionComponents()

        const submissionOptions = {
            content: message.content,
            files: message.attachments.map((attachment) => attachment.url),
        } as MessageCreateOptions

        const pendingMessage = await frank.utils.channels.approval.send({
            content: message.content,
            files: message.attachments.map((attachment) => attachment.url),
            components,
        })
        
        message.react('☑️')

        const collector = pendingMessage.createMessageComponentCollector({
            time: 200_000_000,
        })

        let submittedMessage: Message<true>

        collector.on('collect', async (interaction) => {
            collector.resetTimer({ time: 1600_000 })
            interaction.deferUpdate()

            let reactionEmote: string
            let submitted: boolean

            if (interaction.customId === Button.Undo) {
                submittedMessage.delete()
                submitted = false
                reactionEmote = '↩️'
            } else if (interaction.customId === Button.Deny) {
                submitted = true
                reactionEmote = '⛔'
            } else {
                submitted = true
                let submissionChannel: TextChannel

                switch (interaction.customId) {
                    case Button.ApproveSink:
                        submissionChannel = frank.utils.channels.sink
                        reactionEmote = '✅'
                        break
                    case Button.ApproveNsfw:
                        submissionChannel = frank.utils.channels.nsfw
                        reactionEmote = '🔞'
                        break
                    case Button.ApproveSerious:
                        submissionChannel = frank.utils.channels.serious
                        reactionEmote = '✔️'
                        break
                }
                submittedMessage =
                    await submissionChannel!.send(submissionOptions)
            }

            Promise.all(
                message.reactions.cache.map((r) => r.users.remove(frank.user!)),
            ).finally(() =>
                message.react(
                    interaction.customId === Button.Undo ? '☑️' : reactionEmote,
                ),
            )
            pendingMessage.reactions
                .removeAll()
                .finally(() => pendingMessage.react(reactionEmote))
            pendingMessage.edit({
                components: frank.utils.submissionComponents(submitted),
            })
        })

        collector.on('dispose', async (collected) => {
            collected.editReply({ components: [] })
        })
    },
}

export default [submissionHandler]
