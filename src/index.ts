import { GatewayIntentBits, Partials } from 'discord.js'
import { Frank } from 'structs/discord'
import { Events } from 'discord.js'

async function main() {
    const frank = new Frank({
        intents: [
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.DirectMessageReactions,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildMessageReactions,
            GatewayIntentBits.MessageContent,
        ],
        partials: [Partials.Channel, Partials.Message, Partials.Reaction],
    })
    frank.login()

    frank.once(Events.ClientReady, (c) => {
        console.clear()
        console.log(`Frank is ready as ${c.user.tag}`)

        // only log errors in development to avoid leaking of identifiable information
        const errorHandler =
            process.env.NODE_ENV === 'production'
                ? () => {}
                : (error: unknown) => console.error(error)

        process.on('unhandledRejection', errorHandler)
        process.on('uncaughtException', errorHandler)
    })
}
main()
