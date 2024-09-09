import {
    ButtonBuilder,
    ActionRowBuilder,
    ButtonStyle,
    TextChannel,
    ReactionManager,
    Message,
    EmbedBuilder,
    AttachmentBuilder,
    AttachmentData,
    MessageCreateOptions,
    PollAnswerData,
    PollData,
    GuildEmoji,
    APIEmoji,
} from "discord.js";
import { v4 as uuid4 } from "uuid";
import { URL } from "url";
import { Frank } from "structs/discord";
import { Button } from "enums";
import config from "config";
import * as crypto from "crypto";
import { join } from "path";
import { readdirSync } from "fs";
import { EventHandler } from "structs/discord";
import { RawGuildEmojiData } from "discord.js/typings/rawDataTypes";

export class FrankUtils {
    private readonly frank: Frank;
    public readonly config = config;

    public readonly channels = {} as {
        approval: TextChannel;
        serious: TextChannel;
        nsfw: TextChannel;
        suomi: TextChannel;
        sink: TextChannel;
    };

    constructor(frank: Frank) {
        this.frank = frank;
    }

    private async loadEvents() {
        const foldersPath = join(__dirname, "..", "events");
        const eventFiles = readdirSync(foldersPath);

        for (const file of eventFiles) {
            const filePath = join(foldersPath, file);
            const eventHandlers = (await import(filePath)).default as EventHandler<unknown>[];

            for (const { name: eventName, execute } of eventHandlers) {
                this.frank.on(eventName as string, execute);
            }
        }
    }

    async init() {
        this.loadEvents();

        // Get the approval channel
        await this.frank.channels.fetch(this.config.APPROVALS_CHANNEL_ID).then((channel) => {
            this.channels.approval = channel as TextChannel;
        });

        // Get the NSFW channel
        await this.frank.channels.fetch(this.config.NSFW_CHANNEL_ID).then((channel) => {
            this.channels.nsfw = channel as TextChannel;
        });

        // Get the serious channel
        await this.frank.channels.fetch(this.config.SERIOUS_CHANNEL_ID).then((channel) => {
            this.channels.serious = channel as TextChannel;
        });

        // Get the suomi channel
        await this.frank.channels.fetch(this.config.SUOMI_CHANNEL_ID).then((channel) => {
            this.channels.suomi = channel as TextChannel;
        });

        // Get the sink channel
        await this.frank.channels.fetch(this.config.SINK_CHANNEL_ID).then((channel) => {
            this.channels.sink = channel as TextChannel;
        });
    }

    submissionComponents(undo?: boolean) {
        undo = !!undo; // force boolean

        const approveButton = new ButtonBuilder().setCustomId(Button.ApproveSink).setLabel("Approve").setStyle(ButtonStyle.Success).setDisabled(undo);
        const approveNsfwButton = new ButtonBuilder().setCustomId(Button.ApproveNsfw).setLabel("NSFW").setStyle(ButtonStyle.Secondary).setDisabled(undo);
        const approveSeriousButton = new ButtonBuilder()
            .setCustomId(Button.ApproveSerious)
            .setLabel("Serious")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(undo);
        const approveSuomiButton = new ButtonBuilder().setCustomId(Button.ApproveSuomi).setLabel("Suomi").setStyle(ButtonStyle.Primary).setDisabled(undo);
        const denyButton = new ButtonBuilder().setCustomId(Button.Deny).setLabel("Deny").setStyle(ButtonStyle.Danger).setDisabled(undo);

        const components = [
            new ActionRowBuilder<ButtonBuilder>().setComponents(approveButton, approveNsfwButton, approveSeriousButton, approveSuomiButton, denyButton),
        ];
        if (undo) {
            const undoButton = new ButtonBuilder().setCustomId(Button.Undo).setLabel("Undo").setStyle(ButtonStyle.Secondary).setDisabled(false);

            components.unshift(new ActionRowBuilder<ButtonBuilder>().setComponents(undoButton));
        }

        return components;
    }

    reactionsRemoveAllSelf(reactions: ReactionManager) {
        return Promise.all(
            reactions.cache.map((reaction) => {
                return reaction.users.remove(this.frank.user!);
            }),
        );
    }

    private generateTripcode(password: string): string {
        const hash = crypto.createHash("sha512").update(password).digest("hex");
        const tripcode = hash.slice(0, 10);
        return tripcode;
    }

    async submissionOptions(message: Message): Promise<MessageCreateOptions> {
        const files: AttachmentBuilder[] = [];
        const embeds: EmbedBuilder[] = [];
        const allowedMentions = {
            parse: [],
        };

        let content = message.content;

        const timestamp = Math.round(message.createdTimestamp / 1000);
        const possibleTripcode = content.split(" ").pop()?.split("\n")?.pop()?.trim();
        do {
            if (possibleTripcode?.includes("#")) {
                try {
                    new URL(possibleTripcode);
                } catch {
                    break;
                }

                const lastIndex = possibleTripcode.lastIndexOf("#");

                const username = possibleTripcode.slice(0, lastIndex).trim();
                const tripcode = this.generateTripcode(possibleTripcode.slice(lastIndex + 1).trim());

                embeds.push(new EmbedBuilder().setDescription(`✅ signed by ${username} !${tripcode}`).setColor(0x272727));
                content = content.replace(possibleTripcode, "").trim();
            }
        } while (false);

        // Parse files
        files.push(
            ...message.attachments.map((a) => {
                const ext = a.name.split(".").splice(1).join(".");
                const filename = ext === "" ? a.id : `${a.id}.${ext}`;

                return new AttachmentBuilder(a.url, a as AttachmentData).setName(filename).setSpoiler(a.spoiler);
            }),
            ...message.stickers.map((s) => {
                return new AttachmentBuilder(s.url, s as AttachmentData).setName(`sticker.png`);
            }),
        );

        // Parse content
        content += `\n<t:${timestamp}:f>`;

        let poll: PollData | undefined;
        if (message.poll) {
            poll = {
                allowMultiselect: message.poll.allowMultiselect ?? false,
                answers: await Promise.all(
                    message.poll.answers.map<Promise<PollAnswerData>>(async (answer) => ({
                        text: answer.text ?? "",
                        emoji: answer.emoji?.id ? await this.uploadEmoji(answer.emoji?.id?.toString()).catch(() => undefined) : undefined,
                    })),
                ),
                question: message.poll.question,
                duration: Math.ceil((message.poll.expiresTimestamp - message.createdTimestamp) / 3_600_000),
            };
        }

        return { files, embeds, content, allowedMentions, poll };
    }

    async uploadEmoji(emojiId: string, name?: string) {
        const emoji = await fetch(`https://cdn.discordapp.com/emojis/${emojiId}.gif`)
            .then((res) => {
                if (res.ok) {
                    return res;
                } else {
                    return fetch(`https://cdn.discordapp.com/emojis/${emojiId}.png`);
                }
            })
            .then((res) => res.arrayBuffer())
            .then((buffer) => Buffer.from(buffer).toString("base64"));

        const url = `https://discord.com/api/v9/applications/${this.frank.user!.id}/emojis`;
        const emojiUploadResponse = await fetch(url, {
            method: "POST",
            headers: {
                // prettier-ignore
                "Authorization": `Bot ${this.config.FRANK_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: name ?? uuid4().replaceAll(/-/g, ""),
                image: `data:image/png;base64,${emoji}`,
            }),
        });

        const json = await emojiUploadResponse.json();
        const id = json.id;
        if (typeof id !== "string") {
            throw new Error("Failed to upload emoji: " + JSON.stringify(json, null, 2));
        }

        return id;
    }

    deleteEmoji(emojiId: string) {
        return fetch(`https://discord.com/api/v9/applications/${this.frank.user!.id}/emojis/${emojiId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bot ${this.config.FRANK_TOKEN}`,
            },
        });
    }

    deleteAllEmojis() {
        return fetch(`https://discord.com/api/v9/applications/${this.frank.user!.id}/emojis`, {
            headers: {
                Authorization: `Bot ${this.config.FRANK_TOKEN}`,
            },
        })
            .then((response) => {
                if (response.ok) {
                    return response.json();
                } else {
                    throw new Error("Failed to fetch emojis");
                }
            })
            .then(async (json) => {
                for (const emoji of json.items) {
                    await this.deleteEmoji(emoji.id).catch(() => {});
                }
            });
    }
}
