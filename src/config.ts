import dotenv from 'dotenv'
dotenv.config()

export default {
    PRODUCTION: process.env.NODE_ENV === 'production',
    FRANK_TOKEN: process.env.FRANK_TOKEN as string,
    APPROVAL_GUILD_ID: process.env.APPROVAL_GUILD_ID as string,
    APPROVALS_CHANNEL_ID: process.env.APPROVALS_CHANNEL_ID as string,
    SINK_CHANNEL_ID: process.env.SINK_CHANNEL_ID as string,
    NSFW_CHANNEL_ID: process.env.NSFW_CHANNEL_ID as string,
    SERIOUS_CHANNEL_ID: process.env.SERIOUS_CHANNEL_ID as string,
}