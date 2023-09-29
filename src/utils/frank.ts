import {
    ButtonBuilder,
    ActionRowBuilder,
    ButtonStyle,
    TextChannel,
} from 'discord.js'
import { Frank } from 'structs/discord'
import { Button } from 'enums'
import config from 'config'

import { join } from 'path'
import { readdirSync } from 'fs'
import { EventHandler } from 'structs/discord'

export class FrankUtils {
    private readonly frank: Frank
    public readonly config = config

    public readonly channels = {} as {
        approval: TextChannel
        serious: TextChannel
        nsfw: TextChannel
        sink: TextChannel
    }

    constructor(frank: Frank) {
        this.frank = frank
    }

    private async loadEvents() {
        const foldersPath = join(__dirname, '..', 'events')
        const eventFiles = readdirSync(foldersPath)

        for (const file of eventFiles) {
            const filePath = join(foldersPath, file)
            const eventHandlers = (await import(filePath))
                .default as EventHandler<unknown>[]

            for (const { name: eventName, execute } of eventHandlers) {
                this.frank.on(eventName as string, execute)
            }
        }
    }

    async init() {
        this.loadEvents()

        // Get the approval channel
        await this.frank.channels
            .fetch(this.config.APPROVALS_CHANNEL_ID)
            .then((channel) => {
                this.channels.approval = channel as TextChannel
            })

        // Get the NSFW channel
        await this.frank.channels
            .fetch(this.config.NSFW_CHANNEL_ID)
            .then((channel) => {
                this.channels.nsfw = channel as TextChannel
            })

        // Get the serious channel
        await this.frank.channels
            .fetch(this.config.SERIOUS_CHANNEL_ID)
            .then((channel) => {
                this.channels.serious = channel as TextChannel
            })

        // Get the sink channel
        await this.frank.channels
            .fetch(this.config.SINK_CHANNEL_ID)
            .then((channel) => {
                this.channels.sink = channel as TextChannel
            })
    }

    submissionComponents(undo?: boolean) {
        undo = !!undo // force boolean

        const approveButton = new ButtonBuilder()
            .setCustomId(Button.ApproveSink)
            .setLabel('Approve')
            .setStyle(ButtonStyle.Success)
            .setDisabled(undo)
        const approveNsfwButton = new ButtonBuilder()
            .setCustomId(Button.ApproveNsfw)
            .setLabel('NSFW')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(undo)
        const approveSeriousButton = new ButtonBuilder()
            .setCustomId(Button.ApproveSerious)
            .setLabel('Serious')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(undo)
        const denyButton = new ButtonBuilder()
            .setCustomId(Button.Deny)
            .setLabel('Deny')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(undo)

        const components = [
            new ActionRowBuilder<ButtonBuilder>().setComponents(
                approveButton,
                approveNsfwButton,
                approveSeriousButton,
                denyButton,
            ),
        ]
        if (undo) {
            const undoButton = new ButtonBuilder()
                .setCustomId(Button.Undo)
                .setLabel('Undo')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(false)

            components.unshift(
                new ActionRowBuilder<ButtonBuilder>().setComponents(undoButton),
            )
        }

        return components
    }
}
