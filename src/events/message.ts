/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    AttachmentBuilder,
    Events,
    Message,
    MessageCreateOptions,
    TextChannel,
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

        const timestamp = Math.round(message.createdTimestamp / 1000)

        const submissionOptions = {
            content: `${message.content} <t:${timestamp}:f>`,
            files: message.attachments.map((attachment) => {
                const ext = attachment.name.split('.').splice(1).join('.')
                const filename =
                    ext === '' ? attachment.id : `${attachment.id}.${ext}`

                return new AttachmentBuilder(attachment.url).setName(filename)
            }),
            components,
        } as MessageCreateOptions

        // prettier-ignore
        const pendingMessage = await frank.utils.channels.approval.send(submissionOptions)

        message.react('☑️')

        const collector = pendingMessage.createMessageComponentCollector({
            time: 200_000_000,
        })

        let submittedMessage: Message<true> | undefined

        collector.on('collect', async (interaction) => {
            collector.resetTimer({ time: 600_000 })
            interaction.deferUpdate()

            let reactionEmote: string
            let undo: boolean

            if (interaction.customId === Button.Undo) {
                undo = false
                reactionEmote = '↩️'
                submittedMessage?.delete()
            } else if (interaction.customId === Button.Deny) {
                undo = true
                reactionEmote = '⛔'
            } else {
                undo = true

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
                await submissionChannel!.send(submissionOptions).then((msg) => {
                    submittedMessage = msg
                })
            }

            Promise.all(
                message.reactions.cache.map((reaction) => {
                    return reaction.users.remove(frank.user!)
                }),
            ).finally(() => {
                message.react(
                    interaction.customId === Button.Undo ? '☑️' : reactionEmote,
                )
            })

            pendingMessage.reactions.removeAll().finally(() => {
                pendingMessage.react(reactionEmote)
            })
            pendingMessage.edit({
                components: frank.utils.submissionComponents(undo),
            })
        })

        collector.on('end', () => {
            pendingMessage.edit({ components: [] })
        })
    },
}

export default [submissionHandler]
