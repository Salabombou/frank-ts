/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    AttachmentBuilder,
    AttachmentData,
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

        const timestamp = Math.round(message.createdTimestamp / 1000)

        const submissionOptions = {
            content: `${message.content} <t:${timestamp}:f>`,
            files: message.attachments.map((a) => {
                const ext = a.name.split('.').splice(1).join('.')
                const filename = ext === '' ? a.id : `${a.id}.${ext}`

                return new AttachmentBuilder(a.url, a as AttachmentData)
                    .setName(filename)
                    .setSpoiler(a.spoiler)
            }),
        } as MessageCreateOptions

        const components = frank.utils.submissionComponents()

        // prettier-ignore
        const pendingMessage = await frank.utils.channels.approval.send({...submissionOptions, components} )

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

            frank.utils
                .reactionsRemoveAllSelf(message.reactions)
                .finally(() => {
                    message.react(
                        interaction.customId === Button.Undo
                            ? '☑️'
                            : reactionEmote,
                    )
                })

            frank.utils
                .reactionsRemoveAllSelf(pendingMessage.reactions)
                .finally(() => {
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
