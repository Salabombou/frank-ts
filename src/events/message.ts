import { Colors, EmbedBuilder, Events, Message, TextChannel } from "discord.js";
import { EventHandler, Frank } from "structs/discord";
import { Button } from "enums";

const submissionHandler: EventHandler<Message> = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;
        if (!message.channel.isDMBased()) return;

        const frank = message.client as Frank;

        const submissionOptions = await frank.utils.submissionOptions(message);
        const components = frank.utils.submissionComponents();

        // prettier-ignore
        const pendingMessage = await frank.utils.channels.approval.send({ ...submissionOptions, components })

        message.react("☑️");

        const collector = pendingMessage.createMessageComponentCollector({
            time: 200_000_000,
        });

        let submittedMessage: Message<true> | undefined;
        let reactionEmote: string;
        let undo: boolean;

        let isSending = false;

        collector.on("collect", async (interaction) => {
            if (isSending) return;

            isSending = true;
            try {
                collector.resetTimer({ time: 600_000 });
                await interaction.deferUpdate();

                if (interaction.customId === Button.Undo) {
                    undo = false;
                    reactionEmote = "↩️";
                    submittedMessage?.delete();
                    submittedMessage = undefined;
                } else if (interaction.customId === Button.Deny) {
                    undo = true;
                    reactionEmote = "⛔";
                } else if (!submittedMessage) {
                    undo = true;

                    let submissionChannel: TextChannel;
                    switch (interaction.customId) {
                        case Button.ApproveSink:
                            submissionChannel = frank.utils.channels.sink;
                            reactionEmote = "✅";
                            break;
                        case Button.ApproveNsfw:
                            submissionChannel = frank.utils.channels.nsfw;
                            reactionEmote = "🔞";
                            break;
                        case Button.ApproveSerious:
                            submissionChannel = frank.utils.channels.serious;
                            reactionEmote = "✔️";
                            break;
                        case Button.ApproveSuomi:
                            submissionChannel = frank.utils.channels.suomi;
                            reactionEmote = "🇫🇮";
                            break;
                    }
                    await submissionChannel!.send(submissionOptions).then((msg) => {
                        submittedMessage = msg;
                    });
                }

                frank.utils.reactionsRemoveAllSelf(message.reactions).finally(() => {
                    message.react(interaction.customId === Button.Undo ? "☑️" : reactionEmote);
                });

                frank.utils.reactionsRemoveAllSelf(pendingMessage.reactions).finally(() => {
                    pendingMessage.react(reactionEmote);
                });

                await pendingMessage.edit({
                    components: frank.utils.submissionComponents(undo),
                });
            } finally {
                isSending = false;
            }
        });

        collector.on("end", async () => {
            pendingMessage.edit({ components: [] });
            switch (reactionEmote) {
                case "☑️":
                case "↩️":
                    frank.utils.reactionsRemoveAllSelf(message.reactions).finally(() => {
                        message.react("💤");
                    });
                    frank.utils.reactionsRemoveAllSelf(pendingMessage.reactions).finally(() => {
                        pendingMessage.react("💤");
                    });
                    break;
            }

            for (const answer of submissionOptions.poll?.answers.values() ?? []) {
                if (answer.emoji) {
                    await frank.utils.deleteEmoji(answer.emoji.toString()).catch(() => {});
                }
            }
        });
    },
};

export default [submissionHandler];
