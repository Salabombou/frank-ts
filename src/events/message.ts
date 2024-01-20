import { Events, Message, TextChannel } from 'discord.js'
import { EventHandler, Frank } from 'structs/discord'
import { Button } from 'enums'

const submissionHandler: EventHandler<Message> = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return
        if (!message.channel.isDMBased()) return

        const frank = message.client as Frank

        const submissionOptions = await frank.utils.submissionOptions(message)
        const components = frank.utils.submissionComponents()

        // prettier-ignore
        const pendingMessage = await frank.utils.channels.approval.send({...submissionOptions, components} )

        message.react('☑️')

        const collector = pendingMessage.createMessageComponentCollector({
            time: 200_000_000,
        })

        let submittedMessage: Message<true> | undefined
        let reactionEmote: string
        let undo: boolean

        collector.on('collect', async (interaction) => {
            collector.resetTimer({ time: 600_000 })
            interaction.deferUpdate()

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
            switch (reactionEmote) {
                case '☑️':
                case '↩️':
                    frank.utils
                        .reactionsRemoveAllSelf(message.reactions)
                        .finally(() => {
                            message.react('💤')
                        })
                    frank.utils
                        .reactionsRemoveAllSelf(pendingMessage.reactions)
                        .finally(() => {
                            pendingMessage.react('💤')
                        })
                    break
            }
        })
    },
}

export default [submissionHandler]
