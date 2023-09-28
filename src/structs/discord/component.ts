import {
    ButtonInteraction,
    AnySelectMenuInteraction,
    InteractionUpdateOptions,
} from 'discord.js'

export interface StaticComponent<ComponentUtils = unknown> {
    utils?: ComponentUtils
    customIDs: string[]
    execute: Record<
        string,
        (
            interaction: ButtonInteraction | AnySelectMenuInteraction,
        ) => Promise<InteractionUpdateOptions>
    >
}

export interface DynamicComponent<
    ComponentUtils = unknown,
    Interaction = ButtonInteraction,
> {
    utils?: ComponentUtils
    execute: (interaction: Interaction) => Promise<InteractionUpdateOptions>
}
